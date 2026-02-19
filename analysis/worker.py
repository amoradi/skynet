"""Hypothesis testing worker."""

import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import pandas as pd
import numpy as np

from database import Database
from stats import StatisticalAnalyzer
from sentiment import SentimentAnalyzer
from config import Config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class HypothesisWorker:
    """Worker that runs statistical tests on hypotheses."""

    def __init__(self):
        self.db = Database()
        self.stats = StatisticalAnalyzer()
        self._sentiment = None

    @property
    def sentiment(self):
        """Lazy load sentiment analyzer (heavy model)."""
        if self._sentiment is None:
            logger.info("Loading FinBERT model...")
            self._sentiment = SentimentAnalyzer()
        return self._sentiment

    def run_hypothesis(self, hypothesis_id: str) -> Dict[str, Any]:
        """Run a single hypothesis test."""
        logger.info(f"Running hypothesis: {hypothesis_id}")

        # Get hypothesis details
        hypothesis = self.db.get_hypothesis(hypothesis_id)
        if not hypothesis:
            raise ValueError(f"Hypothesis not found: {hypothesis_id}")

        event_type = hypothesis["event_type"]
        market_asset = hypothesis["market_asset"]
        test_type = hypothesis["test_type"]
        lookback_days = hypothesis.get("lookback_days", 365)

        # Get data
        end_date = datetime.now()
        start_date = end_date - timedelta(days=lookback_days)

        try:
            events = self.db.get_events(
                event_type=event_type,
                start_date=start_date,
                end_date=end_date,
            )

            market_data = self.db.get_market_data(
                asset=market_asset,
                start_date=start_date,
                end_date=end_date,
            )

            if len(events) < Config.MIN_SAMPLE_SIZE:
                raise ValueError(f"Not enough events: {len(events)}")
            if len(market_data) < Config.MIN_SAMPLE_SIZE:
                raise ValueError(f"Not enough market data: {len(market_data)}")

            # Run appropriate test
            if test_type == "correlation":
                results = self._run_correlation_test(events, market_data)
            elif test_type == "granger_causality":
                results = self._run_granger_test(events, market_data)
            elif test_type == "event_study":
                results = self._run_event_study(events, market_data)
            else:
                raise ValueError(f"Unknown test type: {test_type}")

            # Update hypothesis with results
            self.db.update_hypothesis_results(
                hypothesis_id=hypothesis_id,
                p_value=results["p_value"],
                hit_rate=results.get("hit_rate", 0.5),
                edge=results.get("edge", 0),
                sample_size=results["sample_size"],
                test_results=results,
            )

            # Create relationship if significant
            if results["significant"]:
                self._create_relationship(hypothesis, results)

            logger.info(f"Hypothesis {hypothesis_id} completed: p={results['p_value']:.4f}")
            return results

        except Exception as e:
            logger.error(f"Hypothesis {hypothesis_id} failed: {e}")
            self.db.mark_hypothesis_failed(hypothesis_id, str(e))
            raise

    def _run_correlation_test(
        self, events: pd.DataFrame, market_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Run correlation analysis."""
        # Aggregate events to daily counts/values
        events["date"] = pd.to_datetime(events["timestamp"]).dt.date
        daily_events = events.groupby("date").agg(
            {"value": "mean", "id": "count"}
        ).rename(columns={"id": "count"})

        # Align with market data
        market_data["date"] = pd.to_datetime(market_data["timestamp"]).dt.date
        daily_prices = market_data.groupby("date").agg({"close": "last"})
        daily_prices["return"] = daily_prices["close"].pct_change()

        # Merge
        merged = daily_events.join(daily_prices, how="inner")
        merged = merged.dropna()

        if len(merged) < Config.MIN_SAMPLE_SIZE:
            raise ValueError(f"Not enough aligned data: {len(merged)}")

        # Use event count or value
        x = merged["count"].values if merged["value"].isna().all() else merged["value"].values
        y = merged["return"].values

        result = self.stats.correlation_test(x, y)

        # Calculate hit rate (positive correlation = positive return)
        hit_rate = np.mean((x > np.median(x)) == (y > 0))
        result["hit_rate"] = float(hit_rate)

        return result

    def _run_granger_test(
        self, events: pd.DataFrame, market_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Run Granger causality test."""
        # Aggregate events to daily
        events["date"] = pd.to_datetime(events["timestamp"]).dt.date
        daily_events = events.groupby("date").agg({"id": "count"}).rename(columns={"id": "count"})

        # Daily returns
        market_data["date"] = pd.to_datetime(market_data["timestamp"]).dt.date
        daily_prices = market_data.groupby("date").agg({"close": "last"})
        daily_prices["return"] = daily_prices["close"].pct_change()

        # Merge and align
        merged = daily_events.join(daily_prices, how="inner").dropna()

        if len(merged) < Config.MIN_SAMPLE_SIZE:
            raise ValueError(f"Not enough aligned data: {len(merged)}")

        x = merged["count"].values
        y = merged["return"].values

        result = self.stats.granger_causality_test(x, y)
        result["sample_size"] = len(merged)

        return result

    def _run_event_study(
        self, events: pd.DataFrame, market_data: pd.DataFrame
    ) -> Dict[str, Any]:
        """Run event study analysis."""
        # Ensure close column exists
        if "close" not in market_data.columns:
            if "price" in market_data.columns:
                market_data["close"] = market_data["price"]
            else:
                raise ValueError("Market data must have 'close' or 'price' column")

        result = self.stats.event_study(events, market_data)
        return result

    def _create_relationship(
        self, hypothesis: Dict[str, Any], results: Dict[str, Any]
    ) -> None:
        """Create a relationship record from significant test results."""
        description = (
            f"{hypothesis['event_type']} → {hypothesis['market_asset']}: "
            f"{results.get('hit_rate', 0) * 100:.1f}% hit rate, "
            f"p={results['p_value']:.4f}"
        )

        self.db.create_relationship(
            event_type=hypothesis["event_type"],
            market_asset=hypothesis["market_asset"],
            hit_rate=results.get("hit_rate", 0.5),
            edge=results.get("edge", 0),
            p_value=results["p_value"],
            sample_size=results["sample_size"],
            description=description,
            metadata=results,
            is_significant=True,
        )
        logger.info(f"Created relationship: {description}")

    def run_all_pending(self) -> Dict[str, Any]:
        """Run all pending hypotheses."""
        # Get pending hypotheses from DB
        query = "SELECT id FROM hypotheses WHERE status = 'pending' ORDER BY created_at ASC"

        with self.db.engine.connect() as conn:
            from sqlalchemy import text
            result = conn.execute(text(query))
            pending_ids = [row[0] for row in result]

        results = {"success": [], "failed": []}

        for hypothesis_id in pending_ids:
            try:
                self.run_hypothesis(str(hypothesis_id))
                results["success"].append(hypothesis_id)
            except Exception as e:
                logger.error(f"Failed: {hypothesis_id}: {e}")
                results["failed"].append({"id": hypothesis_id, "error": str(e)})

        return results


if __name__ == "__main__":
    worker = HypothesisWorker()
    results = worker.run_all_pending()
    print(f"Completed: {len(results['success'])} success, {len(results['failed'])} failed")

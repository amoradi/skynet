"""Database connection and queries for analysis."""

from datetime import datetime
from typing import List, Optional, Dict, Any
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from config import Config


class Database:
    def __init__(self):
        self.engine = create_engine(Config.get_db_url())
        self.Session = sessionmaker(bind=self.engine)

    def get_events(
        self,
        source: Optional[str] = None,
        event_type: Optional[str] = None,
        entity: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """Get events as a DataFrame."""
        query = "SELECT * FROM events WHERE 1=1"
        params: Dict[str, Any] = {}

        if source:
            query += " AND source = :source"
            params["source"] = source
        if event_type:
            query += " AND event_type = :event_type"
            params["event_type"] = event_type
        if entity:
            query += " AND entity = :entity"
            params["entity"] = entity
        if start_date:
            query += " AND timestamp >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND timestamp <= :end_date"
            params["end_date"] = end_date

        query += " ORDER BY timestamp ASC"

        with self.engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        return df

    def get_market_data(
        self,
        asset: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> pd.DataFrame:
        """Get market data as a DataFrame."""
        query = "SELECT * FROM market_data WHERE asset = :asset"
        params: Dict[str, Any] = {"asset": asset}

        if start_date:
            query += " AND timestamp >= :start_date"
            params["start_date"] = start_date
        if end_date:
            query += " AND timestamp <= :end_date"
            params["end_date"] = end_date

        query += " ORDER BY timestamp ASC"

        with self.engine.connect() as conn:
            df = pd.read_sql(text(query), conn, params=params)
        return df

    def get_hypothesis(self, hypothesis_id: str) -> Optional[Dict[str, Any]]:
        """Get a hypothesis by ID."""
        query = "SELECT * FROM hypotheses WHERE id = :id"
        with self.engine.connect() as conn:
            result = conn.execute(text(query), {"id": hypothesis_id})
            row = result.fetchone()
            if row:
                return dict(row._mapping)
        return None

    def update_hypothesis_results(
        self,
        hypothesis_id: str,
        p_value: float,
        hit_rate: float,
        edge: float,
        sample_size: int,
        test_results: Dict[str, Any],
    ) -> None:
        """Update hypothesis with test results."""
        query = """
            UPDATE hypotheses
            SET status = 'completed',
                p_value = :p_value,
                hit_rate = :hit_rate,
                edge = :edge,
                sample_size = :sample_size,
                test_results = :test_results,
                tested_at = NOW()
            WHERE id = :id
        """
        with self.engine.connect() as conn:
            conn.execute(
                text(query),
                {
                    "id": hypothesis_id,
                    "p_value": p_value,
                    "hit_rate": hit_rate,
                    "edge": edge,
                    "sample_size": sample_size,
                    "test_results": str(test_results),
                },
            )
            conn.commit()

    def mark_hypothesis_failed(self, hypothesis_id: str, error: str) -> None:
        """Mark hypothesis as failed."""
        query = """
            UPDATE hypotheses
            SET status = 'failed',
                error_message = :error,
                tested_at = NOW()
            WHERE id = :id
        """
        with self.engine.connect() as conn:
            conn.execute(text(query), {"id": hypothesis_id, "error": error})
            conn.commit()

    def create_relationship(
        self,
        event_type: str,
        market_asset: str,
        hit_rate: float,
        edge: float,
        p_value: float,
        sample_size: int,
        description: str,
        metadata: Dict[str, Any],
        is_significant: bool,
    ) -> str:
        """Create a new relationship."""
        query = """
            INSERT INTO relationships
            (event_type, market_asset, hit_rate, edge, p_value, sample_size,
             description, metadata, is_significant)
            VALUES
            (:event_type, :market_asset, :hit_rate, :edge, :p_value, :sample_size,
             :description, :metadata, :is_significant)
            RETURNING id
        """
        with self.engine.connect() as conn:
            result = conn.execute(
                text(query),
                {
                    "event_type": event_type,
                    "market_asset": market_asset,
                    "hit_rate": hit_rate,
                    "edge": edge,
                    "p_value": p_value,
                    "sample_size": sample_size,
                    "description": description,
                    "metadata": str(metadata),
                    "is_significant": is_significant,
                },
            )
            conn.commit()
            row = result.fetchone()
            return str(row[0]) if row else ""

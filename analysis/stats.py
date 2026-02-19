"""Statistical analysis functions."""

from typing import Dict, Any, List, Tuple, Optional
import numpy as np
import pandas as pd
from scipy import stats
from scipy.stats import pearsonr, spearmanr, ttest_ind, mannwhitneyu
from statsmodels.tsa.stattools import grangercausalitytests, adfuller
from statsmodels.stats.multitest import multipletests

from config import Config


class StatisticalAnalyzer:
    """Core statistical analysis engine."""

    def __init__(self):
        self.significance_level = Config.SIGNIFICANCE_LEVEL
        self.min_sample_size = Config.MIN_SAMPLE_SIZE
        self.use_bonferroni = Config.BONFERRONI_CORRECTION

    def correlation_test(
        self, x: np.ndarray, y: np.ndarray, method: str = "pearson"
    ) -> Dict[str, Any]:
        """Test correlation between two time series."""
        if len(x) != len(y):
            raise ValueError("Arrays must have same length")
        if len(x) < self.min_sample_size:
            raise ValueError(f"Need at least {self.min_sample_size} samples")

        if method == "pearson":
            corr, p_value = pearsonr(x, y)
        elif method == "spearman":
            corr, p_value = spearmanr(x, y)
        else:
            raise ValueError(f"Unknown method: {method}")

        return {
            "correlation": float(corr),
            "p_value": float(p_value),
            "significant": p_value < self.significance_level,
            "sample_size": len(x),
            "method": method,
        }

    def granger_causality_test(
        self, x: np.ndarray, y: np.ndarray, max_lag: int = 5
    ) -> Dict[str, Any]:
        """Test if x Granger-causes y."""
        if len(x) != len(y):
            raise ValueError("Arrays must have same length")
        if len(x) < self.min_sample_size:
            raise ValueError(f"Need at least {self.min_sample_size} samples")

        # Combine into DataFrame
        data = pd.DataFrame({"x": x, "y": y})

        # Run Granger causality test
        try:
            results = grangercausalitytests(data[["y", "x"]], maxlag=max_lag, verbose=False)

            # Get minimum p-value across lags
            p_values = []
            for lag in range(1, max_lag + 1):
                p_val = results[lag][0]["ssr_ftest"][1]
                p_values.append(p_val)

            min_p = min(p_values)
            best_lag = p_values.index(min_p) + 1

            return {
                "p_value": float(min_p),
                "best_lag": best_lag,
                "significant": min_p < self.significance_level,
                "sample_size": len(x),
                "all_p_values": {i + 1: float(p) for i, p in enumerate(p_values)},
            }
        except Exception as e:
            return {
                "error": str(e),
                "p_value": 1.0,
                "significant": False,
            }

    def event_study(
        self,
        events: pd.DataFrame,
        prices: pd.DataFrame,
        pre_window: int = 5,
        post_window: int = 10,
    ) -> Dict[str, Any]:
        """Run event study analysis."""
        if len(events) < self.min_sample_size:
            raise ValueError(f"Need at least {self.min_sample_size} events")

        # Calculate returns
        prices = prices.sort_values("timestamp")
        prices["return"] = prices["close"].pct_change()

        # Align events with prices
        results = []
        for _, event in events.iterrows():
            event_date = pd.to_datetime(event["timestamp"])

            # Get returns around event
            mask = (prices["timestamp"] >= event_date - pd.Timedelta(days=pre_window)) & (
                prices["timestamp"] <= event_date + pd.Timedelta(days=post_window)
            )
            window_returns = prices.loc[mask, "return"].dropna()

            if len(window_returns) > 0:
                cumulative_return = (1 + window_returns).prod() - 1
                results.append(cumulative_return)

        if len(results) < self.min_sample_size:
            raise ValueError(f"Only {len(results)} valid event windows found")

        results = np.array(results)

        # Calculate statistics
        mean_return = np.mean(results)
        std_return = np.std(results)
        t_stat, p_value = stats.ttest_1samp(results, 0)

        # Hit rate (positive returns)
        hit_rate = np.mean(results > 0)

        # Edge (risk-adjusted return)
        edge = mean_return / std_return if std_return > 0 else 0

        return {
            "mean_return": float(mean_return),
            "std_return": float(std_return),
            "t_statistic": float(t_stat),
            "p_value": float(p_value),
            "hit_rate": float(hit_rate),
            "edge": float(edge),
            "sample_size": len(results),
            "significant": p_value < self.significance_level,
            "pre_window": pre_window,
            "post_window": post_window,
        }

    def lead_lag_analysis(
        self, x: np.ndarray, y: np.ndarray, max_lag: int = 10
    ) -> Dict[str, Any]:
        """Find optimal lead/lag between two series."""
        if len(x) != len(y):
            raise ValueError("Arrays must have same length")

        correlations = {}
        for lag in range(-max_lag, max_lag + 1):
            if lag < 0:
                x_shifted = x[-lag:]
                y_shifted = y[:lag]
            elif lag > 0:
                x_shifted = x[:-lag]
                y_shifted = y[lag:]
            else:
                x_shifted = x
                y_shifted = y

            if len(x_shifted) >= self.min_sample_size:
                corr, _ = pearsonr(x_shifted, y_shifted)
                correlations[lag] = float(corr)

        if not correlations:
            raise ValueError("Not enough data for lead/lag analysis")

        best_lag = max(correlations, key=lambda k: abs(correlations[k]))
        best_corr = correlations[best_lag]

        return {
            "best_lag": best_lag,
            "best_correlation": best_corr,
            "all_correlations": correlations,
            "interpretation": f"X leads Y by {abs(best_lag)} periods"
            if best_lag < 0
            else f"Y leads X by {best_lag} periods"
            if best_lag > 0
            else "No lead/lag relationship",
        }

    def apply_bonferroni(
        self, p_values: List[float], alpha: float = 0.05
    ) -> Dict[str, Any]:
        """Apply Bonferroni correction to multiple p-values."""
        reject, corrected_p, _, _ = multipletests(p_values, alpha=alpha, method="bonferroni")

        return {
            "original_p_values": p_values,
            "corrected_p_values": corrected_p.tolist(),
            "reject_null": reject.tolist(),
            "num_significant": int(sum(reject)),
            "correction_factor": len(p_values),
        }

    def stationarity_test(self, x: np.ndarray) -> Dict[str, Any]:
        """Test if series is stationary using ADF test."""
        result = adfuller(x, autolag="AIC")

        return {
            "adf_statistic": float(result[0]),
            "p_value": float(result[1]),
            "used_lag": int(result[2]),
            "num_observations": int(result[3]),
            "critical_values": {k: float(v) for k, v in result[4].items()},
            "is_stationary": result[1] < self.significance_level,
        }

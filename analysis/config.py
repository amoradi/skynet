"""Configuration for the analysis worker."""

import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Database
    DB_HOST = os.getenv("DB_HOST", "localhost")
    DB_PORT = int(os.getenv("DB_PORT", "5432"))
    DB_NAME = os.getenv("DB_NAME", "skynet")
    DB_USER = os.getenv("DB_USERNAME", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "postgres")

    @classmethod
    def get_db_url(cls) -> str:
        return f"postgresql://{cls.DB_USER}:{cls.DB_PASSWORD}@{cls.DB_HOST}:{cls.DB_PORT}/{cls.DB_NAME}"

    # Analysis settings
    MIN_SAMPLE_SIZE = int(os.getenv("MIN_SAMPLE_SIZE", "30"))
    SIGNIFICANCE_LEVEL = float(os.getenv("SIGNIFICANCE_LEVEL", "0.05"))
    BONFERRONI_CORRECTION = os.getenv("BONFERRONI_CORRECTION", "true").lower() == "true"

    # NLP settings
    SENTIMENT_MODEL = os.getenv("SENTIMENT_MODEL", "ProsusAI/finbert")
    USE_GPU = os.getenv("USE_GPU", "false").lower() == "true"

    # API settings
    API_HOST = os.getenv("ANALYSIS_API_HOST", "0.0.0.0")
    API_PORT = int(os.getenv("ANALYSIS_API_PORT", "8001"))

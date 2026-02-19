# Analysis Worker

Python-based statistical analysis engine using scipy and FinBERT.

## Setup

```bash
cd analysis
python -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
```

## Components

### stats.py
Core statistical tests:
- Correlation (Pearson, Spearman)
- Granger causality
- Event studies
- Lead/lag analysis
- Bonferroni correction
- Stationarity tests (ADF)

### sentiment.py
FinBERT-based sentiment analysis for financial text:
- Single text analysis
- Batch processing
- Aggregate statistics

### worker.py
Hypothesis testing worker:
- Fetches data from PostgreSQL
- Runs appropriate statistical test
- Updates results
- Creates relationships for significant findings

### api.py
FastAPI server for NestJS integration:
- `/hypothesis/run` - Queue hypothesis test
- `/stats/correlation` - Run correlation test
- `/sentiment/analyze` - Analyze text sentiment

## Running

```bash
# Start API server
python api.py

# Or run worker directly
python worker.py
```

## Environment Variables

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=skynet
DB_USERNAME=postgres
DB_PASSWORD=postgres

ANALYSIS_API_HOST=0.0.0.0
ANALYSIS_API_PORT=8001

SENTIMENT_MODEL=ProsusAI/finbert
USE_GPU=false
```

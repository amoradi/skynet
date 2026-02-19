"""FastAPI server for analysis worker - called by NestJS."""

from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
import uvicorn

from worker import HypothesisWorker
from stats import StatisticalAnalyzer
from sentiment import SentimentAnalyzer
from config import Config

app = FastAPI(title="Skynet Analysis Worker", version="1.0.0")

# Initialize workers
worker = HypothesisWorker()
stats = StatisticalAnalyzer()
_sentiment = None


def get_sentiment():
    global _sentiment
    if _sentiment is None:
        _sentiment = SentimentAnalyzer()
    return _sentiment


# Request/Response models
class HypothesisRequest(BaseModel):
    hypothesis_id: str


class CorrelationRequest(BaseModel):
    x: List[float]
    y: List[float]
    method: str = "pearson"


class SentimentRequest(BaseModel):
    texts: List[str]


class EventStudyRequest(BaseModel):
    event_type: str
    market_asset: str
    start_date: str
    end_date: str
    pre_window: int = 5
    post_window: int = 10


# Endpoints
@app.get("/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}


@app.post("/hypothesis/run")
async def run_hypothesis(request: HypothesisRequest, background_tasks: BackgroundTasks):
    """Queue a hypothesis for testing."""
    try:
        # Run in background to avoid timeout
        background_tasks.add_task(worker.run_hypothesis, request.hypothesis_id)
        return {"status": "queued", "hypothesis_id": request.hypothesis_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hypothesis/run-sync")
async def run_hypothesis_sync(request: HypothesisRequest):
    """Run hypothesis synchronously (blocking)."""
    try:
        result = worker.run_hypothesis(request.hypothesis_id)
        return {"status": "completed", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/hypothesis/run-all")
async def run_all_pending(background_tasks: BackgroundTasks):
    """Run all pending hypotheses."""
    background_tasks.add_task(worker.run_all_pending)
    return {"status": "queued"}


@app.post("/stats/correlation")
async def correlation_test(request: CorrelationRequest):
    """Run correlation test on provided data."""
    try:
        import numpy as np
        result = stats.correlation_test(
            np.array(request.x),
            np.array(request.y),
            request.method,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/stats/granger")
async def granger_test(request: CorrelationRequest):
    """Run Granger causality test."""
    try:
        import numpy as np
        result = stats.granger_causality_test(
            np.array(request.x),
            np.array(request.y),
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/sentiment/analyze")
async def analyze_sentiment(request: SentimentRequest):
    """Analyze sentiment of texts using FinBERT."""
    try:
        sentiment = get_sentiment()
        if len(request.texts) == 1:
            result = sentiment.analyze(request.texts[0])
        else:
            result = sentiment.analyze_batch(request.texts)
        return {"results": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/sentiment/aggregate")
async def aggregate_sentiment(request: SentimentRequest):
    """Get aggregate sentiment statistics."""
    try:
        sentiment = get_sentiment()
        result = sentiment.aggregate_sentiment(request.texts)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(
        "api:app",
        host=Config.API_HOST,
        port=Config.API_PORT,
        reload=True,
    )

"""Sentiment analysis using FinBERT."""

from typing import List, Dict, Any, Optional
import torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import numpy as np

from config import Config


class SentimentAnalyzer:
    """FinBERT-based sentiment analysis for financial text."""

    def __init__(self, model_name: Optional[str] = None):
        self.model_name = model_name or Config.SENTIMENT_MODEL
        self.device = "cuda" if Config.USE_GPU and torch.cuda.is_available() else "cpu"

        self._tokenizer = None
        self._model = None

    @property
    def tokenizer(self):
        if self._tokenizer is None:
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
        return self._tokenizer

    @property
    def model(self):
        if self._model is None:
            self._model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name
            ).to(self.device)
            self._model.eval()
        return self._model

    def analyze(self, text: str) -> Dict[str, Any]:
        """Analyze sentiment of a single text."""
        inputs = self.tokenizer(
            text,
            return_tensors="pt",
            truncation=True,
            max_length=512,
            padding=True,
        ).to(self.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            probs = torch.softmax(outputs.logits, dim=-1)

        # FinBERT labels: positive, negative, neutral
        labels = ["positive", "negative", "neutral"]
        scores = probs[0].cpu().numpy()

        predicted_idx = np.argmax(scores)
        predicted_label = labels[predicted_idx]
        confidence = float(scores[predicted_idx])

        # Calculate sentiment score (-1 to 1)
        sentiment_score = float(scores[0] - scores[1])  # positive - negative

        return {
            "label": predicted_label,
            "confidence": confidence,
            "sentiment_score": sentiment_score,
            "probabilities": {label: float(score) for label, score in zip(labels, scores)},
        }

    def analyze_batch(self, texts: List[str], batch_size: int = 32) -> List[Dict[str, Any]]:
        """Analyze sentiment of multiple texts."""
        results = []

        for i in range(0, len(texts), batch_size):
            batch = texts[i : i + batch_size]

            inputs = self.tokenizer(
                batch,
                return_tensors="pt",
                truncation=True,
                max_length=512,
                padding=True,
            ).to(self.device)

            with torch.no_grad():
                outputs = self.model(**inputs)
                probs = torch.softmax(outputs.logits, dim=-1)

            labels = ["positive", "negative", "neutral"]

            for j, scores in enumerate(probs):
                scores = scores.cpu().numpy()
                predicted_idx = np.argmax(scores)
                predicted_label = labels[predicted_idx]
                confidence = float(scores[predicted_idx])
                sentiment_score = float(scores[0] - scores[1])

                results.append({
                    "text": batch[j][:100] + "..." if len(batch[j]) > 100 else batch[j],
                    "label": predicted_label,
                    "confidence": confidence,
                    "sentiment_score": sentiment_score,
                })

        return results

    def aggregate_sentiment(self, texts: List[str]) -> Dict[str, Any]:
        """Get aggregate sentiment statistics for a list of texts."""
        if not texts:
            return {
                "mean_sentiment": 0.0,
                "sentiment_std": 0.0,
                "positive_ratio": 0.0,
                "negative_ratio": 0.0,
                "neutral_ratio": 0.0,
                "count": 0,
            }

        results = self.analyze_batch(texts)

        sentiment_scores = [r["sentiment_score"] for r in results]
        labels = [r["label"] for r in results]

        return {
            "mean_sentiment": float(np.mean(sentiment_scores)),
            "sentiment_std": float(np.std(sentiment_scores)),
            "positive_ratio": labels.count("positive") / len(labels),
            "negative_ratio": labels.count("negative") / len(labels),
            "neutral_ratio": labels.count("neutral") / len(labels),
            "count": len(texts),
        }

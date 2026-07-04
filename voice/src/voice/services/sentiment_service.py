import json
import logging

logger = logging.getLogger(__name__)


def score_sentiment(reply_from_runtime: dict) -> dict:
    answer = reply_from_runtime.get("answer", "")
    if isinstance(answer, dict):
        return {"label": answer.get("label", "neutral"), "score": float(answer.get("score", 0.0))}

    try:
        data = json.loads(answer)
        return {"label": data.get("label", "neutral"), "score": float(data.get("score", 0.0))}
    except (json.JSONDecodeError, TypeError, ValueError):
        logger.warning("sentiment_parse_failed: defaulting to neutral; answer=%r", answer)

    return {"label": "neutral", "score": 0.0}

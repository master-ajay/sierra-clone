def score_sentiment(reply_from_runtime: dict) -> dict:
    """Parse sentiment from Agent Runtime response.

    Expected shape: {"label": str, "score": float} embedded in the answer field
    or as a direct dict with label/score keys.
    """
    answer = reply_from_runtime.get("answer", "")
    # If the runtime returned structured data via a dict answer
    if isinstance(answer, dict):
        return {"label": answer.get("label", "neutral"), "score": float(answer.get("score", 0.0))}

    # Try to parse JSON from the answer string
    import json

    try:
        data = json.loads(answer)
        return {"label": data.get("label", "neutral"), "score": float(data.get("score", 0.0))}
    except (json.JSONDecodeError, TypeError, ValueError):
        pass

    # Fallback: neutral sentiment
    return {"label": "neutral", "score": 0.0}

from pydantic import BaseModel


class TurnRequest(BaseModel):
    text: str


class TurnResponse(BaseModel):
    reply: str
    sentiment: dict  # { "label": str, "score": float }
    call_sentiment_trend: list[float]
    escalation_recommended: bool


class CallResponse(BaseModel):
    call_id: str
    line_id: str
    session_id: str
    status: str
    sentiment_trend_json: str
    created_at: str
    ended_at: str | None

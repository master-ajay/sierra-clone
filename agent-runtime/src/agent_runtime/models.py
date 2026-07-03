from pydantic import BaseModel


class Chunk(BaseModel):
    id: str
    text: str
    source: str
    score: float = 0.0


class GuardrailTrace(BaseModel):
    faithfulness_score: float
    threshold: float
    passed: bool

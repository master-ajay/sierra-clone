from pydantic import BaseModel, model_validator


class ResolutionCreate(BaseModel):
    conversation_id: str
    transcript: list[dict] | None = None
    adp_session_id: str | None = None
    resolution_note: str
    topic: str | None = None

    @model_validator(mode="after")
    def exactly_one_source(self) -> "ResolutionCreate":
        has_transcript = self.transcript is not None
        has_session = self.adp_session_id is not None
        if has_transcript == has_session:
            raise ValueError("Provide exactly one of 'transcript' or 'adp_session_id'")
        return self


class ResolutionResponse(BaseModel):
    resolution_id: str
    conversation_id: str
    adp_session_id: str | None
    resolution_note: str
    topic: str | None
    status: str
    created_at: str

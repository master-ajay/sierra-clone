from pydantic import BaseModel

from adp.models.message import MessageResponse
from adp.models.user import UserResponse


class ContextRequest(BaseModel):
    user_id: str
    session_id: str | None = None
    max_tokens: int = 2048
    max_messages: int = 50
    include_user_profile: bool = True
    include_history: bool = True


class SessionSummary(BaseModel):
    total_sessions: int
    last_interaction: str | None


class ContextResponse(BaseModel):
    user: UserResponse | None
    messages: list[MessageResponse]
    session_summary: SessionSummary
    token_estimate: int

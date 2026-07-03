from typing import Literal

from pydantic import BaseModel


class SessionCreate(BaseModel):
    metadata: dict = {}


class SessionUpdate(BaseModel):
    metadata: dict | None = None
    status: Literal["active", "closed"] | None = None


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    status: str
    metadata: dict
    started_at: str
    updated_at: str
    closed_at: str | None

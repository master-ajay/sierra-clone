from typing import Literal

from pydantic import BaseModel


class MessageCreate(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str
    metadata: dict = {}


class MessageResponse(BaseModel):
    message_id: str
    session_id: str
    role: str
    content: str
    metadata: dict
    created_at: str

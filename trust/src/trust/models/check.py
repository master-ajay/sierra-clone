from typing import Literal
from pydantic import BaseModel


class CheckRequest(BaseModel):
    message: str
    channel_id: str
    direction: Literal["inbound", "outbound"]
    context: dict = {}


class Flag(BaseModel):
    type: Literal["pii", "prompt_injection", "rate_limit"]
    detail: str
    severity: Literal["warn", "block"]


class CheckResponse(BaseModel):
    allowed: bool
    message_clean: str
    flags: list[Flag]
    audit_id: str


class AuditRecord(BaseModel):
    audit_id: str
    channel_id: str
    direction: str
    message_clean: str
    flags: list[Flag]
    allowed: bool
    created_at: str

from typing import Literal

from pydantic import BaseModel


class ChannelCreate(BaseModel):
    agent_id: str
    name: str
    type: Literal["widget", "api"]


class ChannelUpdate(BaseModel):
    name: str | None = None
    status: Literal["active", "paused"] | None = None


class ChannelResponse(BaseModel):
    channel_id: str
    agent_id: str
    adp_user_id: str
    name: str
    type: str
    status: str
    channel_key: str
    created_at: str
    updated_at: str

from pydantic import BaseModel


class LineCreate(BaseModel):
    agent_id: str
    name: str


class LineUpdate(BaseModel):
    name: str | None = None
    status: str | None = None


class LineResponse(BaseModel):
    line_id: str
    agent_id: str
    adp_user_id: str
    name: str
    status: str
    line_key: str
    created_at: str
    updated_at: str

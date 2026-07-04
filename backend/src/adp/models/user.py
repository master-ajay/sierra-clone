from pydantic import BaseModel


class UserCreate(BaseModel):
    external_id: str | None = None
    display_name: str
    metadata: dict = {}


class UserUpdate(BaseModel):
    display_name: str | None = None
    metadata: dict | None = None


class UserResponse(BaseModel):
    user_id: str
    external_id: str | None
    display_name: str
    metadata: dict
    created_at: str
    updated_at: str

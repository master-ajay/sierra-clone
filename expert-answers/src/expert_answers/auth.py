from fastapi import Depends, HTTPException, Security
from fastapi.security import APIKeyHeader

from expert_answers.config import Settings, get_settings

_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def require_api_key(key: str | None = Security(_header), settings: Settings = Depends(get_settings)) -> None:
    if not key or key != settings.expert_answers_api_key:
        raise HTTPException(status_code=401, detail={"error": {"code": "unauthorized", "message": "Invalid or missing API key", "details": {}}})

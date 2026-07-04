from fastapi import Depends, HTTPException, Request

from channels.config import Settings, get_settings


async def require_api_key(request: Request, settings: Settings = Depends(get_settings)) -> None:
    key = request.headers.get("X-API-Key", "")
    if key != settings.channels_api_key:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "unauthorized", "message": "Invalid or missing API key", "details": {}}},
        )

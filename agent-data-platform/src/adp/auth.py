from fastapi import Depends, Request
from fastapi.responses import JSONResponse

from adp.config import Settings, get_settings
from adp.errors import error_response


async def require_api_key(request: Request, settings: Settings = Depends(get_settings)) -> None:
    key = request.headers.get("X-API-Key", "")
    if key != settings.adp_api_key:
        raise _unauthorized()


def _unauthorized() -> Exception:
    from fastapi import HTTPException
    raise HTTPException(
        status_code=401,
        detail={"error": {"code": "unauthorized", "message": "Invalid or missing API key", "details": {}}},
    )

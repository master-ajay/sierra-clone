from fastapi import APIRouter, Depends, Request

from trust.auth import require_api_key
from trust.config import Settings, get_settings
from trust.database import get_connection
from trust.models.check import CheckRequest, CheckResponse
from trust.services.check_service import run_check

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/check", response_model=CheckResponse)
def check(body: CheckRequest, request: Request, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.trust_db_path)
    result = run_check(
        conn,
        request.app.state.rate_limiter,
        message=body.message,
        channel_id=body.channel_id,
        direction=body.direction,
    )
    return result

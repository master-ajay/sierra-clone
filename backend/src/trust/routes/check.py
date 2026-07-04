from fastapi import APIRouter, Depends

from trust.auth import require_api_key
from trust.config import Settings, get_settings
from trust.database import get_connection
from trust.models.check import CheckRequest
from trust.services.check_service import run_check
from trust.services.rate_limiter import get_window_state

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/check")
def check(body: CheckRequest, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.trust_db_path)
    return run_check(conn, body, settings)


@router.get("/v1/rate-limit/{channel_id}")
def rate_limit_state(channel_id: str, settings: Settings = Depends(get_settings)):
    return get_window_state(channel_id, settings.trust_rate_limit_rpm)

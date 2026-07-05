import logging

from fastapi import APIRouter, Depends

from voice.auth import require_api_key
from voice.config import Settings, get_settings
from voice.database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/v1/health", dependencies=[Depends(require_api_key)])
def health(settings: Settings = Depends(get_settings)) -> dict:
    conn = get_connection(settings.voice_db_path)
    try:
        conn.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        logger.exception("health_db_check_failed db=%s", settings.voice_db_path)
        db_status = "error"
    finally:
        conn.close()
    return {"status": "ok", "database": db_status}

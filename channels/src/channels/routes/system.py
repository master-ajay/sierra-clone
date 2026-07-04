import logging

from fastapi import APIRouter, Depends

from channels.auth import require_api_key
from channels.config import Settings, get_settings
from channels.database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/health")
def health(settings: Settings = Depends(get_settings)) -> dict:
    try:
        conn = get_connection(settings.channels_db_path)
        conn.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception:
        logger.exception("health_db_check_failed db=%s", settings.channels_db_path)
        db_status = "error"
    return {"status": "ok", "database": db_status}


@router.get("/v1/stats")
def stats(settings: Settings = Depends(get_settings)) -> dict:
    conn = get_connection(settings.channels_db_path)
    total_channels = conn.execute("SELECT COUNT(*) FROM channels").fetchone()[0]
    active = conn.execute("SELECT COUNT(*) FROM channels WHERE status='active'").fetchone()[0]
    total_messages = conn.execute("SELECT COALESCE(SUM(total_messages),0) FROM channel_stats").fetchone()[0]
    conn.close()
    return {"channels": {"total": total_channels, "active": active}, "messages": total_messages}

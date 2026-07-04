import logging

from fastapi import APIRouter, Depends

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/health")
def health(settings: Settings = Depends(get_settings)) -> dict:
    try:
        conn = get_connection(settings.adp_db_path)
        try:
            conn.execute("SELECT 1")
        finally:
            conn.close()
        db_status = "connected"
    except Exception:
        logger.exception("health_db_check_failed db=%s", settings.adp_db_path)
        db_status = "error"
    return {"status": "ok", "database": db_status}


@router.get("/v1/stats")
def stats(settings: Settings = Depends(get_settings)) -> dict:
    conn = get_connection(settings.adp_db_path)
    try:
        total_users = conn.execute("SELECT COUNT(*) FROM adp_users").fetchone()[0]
        active_sessions = conn.execute("SELECT COUNT(*) FROM adp_sessions WHERE status='active'").fetchone()[0]
        closed_sessions = conn.execute("SELECT COUNT(*) FROM adp_sessions WHERE status='closed'").fetchone()[0]
        total_messages = conn.execute("SELECT COUNT(*) FROM adp_messages").fetchone()[0]
        return {
            "users": total_users,
            "sessions": {"active": active_sessions, "closed": closed_sessions},
            "messages": total_messages,
        }
    finally:
        conn.close()

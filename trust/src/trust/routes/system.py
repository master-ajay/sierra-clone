from fastapi import APIRouter, Depends

from trust.auth import require_api_key
from trust.config import Settings, get_settings
from trust.database import get_connection
from trust.services.audit_service import get_stats

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/health")
def health(settings: Settings = Depends(get_settings)) -> dict:
    try:
        conn = get_connection(settings.trust_db_path)
        conn.execute("SELECT 1")
        conn.close()
        return {"status": "ok", "database": "connected"}
    except Exception:
        return {"status": "ok", "database": "error"}


@router.get("/v1/stats")
def stats(settings: Settings = Depends(get_settings)) -> dict:
    conn = get_connection(settings.trust_db_path)
    result = get_stats(conn)
    conn.close()
    return result

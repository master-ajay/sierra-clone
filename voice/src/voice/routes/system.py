from fastapi import APIRouter, Depends

from voice.auth import require_api_key
from voice.config import Settings, get_settings
from voice.database import get_connection

router = APIRouter()


@router.get("/v1/health", dependencies=[Depends(require_api_key)])
def health(settings: Settings = Depends(get_settings)) -> dict:
    conn = get_connection(settings.voice_db_path)
    try:
        conn.execute("SELECT 1")
        db_status = "connected"
    except Exception:
        db_status = "error"
    finally:
        conn.close()
    return {"status": "ok", "database": db_status}

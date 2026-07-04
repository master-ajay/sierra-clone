import logging
import sqlite3

from fastapi import APIRouter, Depends

from expert_answers.auth import require_api_key
from expert_answers.config import Settings, get_settings

logger = logging.getLogger(__name__)

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/health")
def health(settings: Settings = Depends(get_settings)):
    try:
        conn = sqlite3.connect(settings.expert_answers_db_path)
        conn.execute("SELECT 1")
        conn.close()
        db_status = "connected"
    except Exception:
        logger.exception("health_db_check_failed db=%s", settings.expert_answers_db_path)
        db_status = "error"
    return {"status": "ok", "database": db_status}

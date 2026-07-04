from fastapi import APIRouter, Depends, Query

from trust.auth import require_api_key
from trust.config import Settings, get_settings
from trust.database import get_connection
from trust.errors import error_response
from trust.services.audit_service import get_audit, list_audit

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/audit")
def list_all(cursor: str | None = Query(None), limit: int = Query(50), settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.trust_db_path)
    items, next_cursor = list_audit(conn, cursor, limit)
    return {"items": items, "next_cursor": next_cursor}


@router.get("/v1/audit/{audit_id}")
def get_one(audit_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.trust_db_path)
    record = get_audit(conn, audit_id)
    if not record:
        return error_response("not_found", "audit record not found", 404)
    return record

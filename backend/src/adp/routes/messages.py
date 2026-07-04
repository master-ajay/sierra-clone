from fastapi import APIRouter, Depends, Query

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection
from adp.errors import error_response
from adp.models.message import MessageCreate
from adp.services.message_service import append_message, batch_append, list_messages
from adp.services.session_service import get_session

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/sessions/{session_id}/messages", status_code=201)
def append(session_id: str, body: MessageCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        session = get_session(conn, session_id)
        if not session:
            return error_response("not_found", "session not found", 404)
        if session.status == "closed":
            return error_response("conflict", "cannot append to a closed session", 409)
        return append_message(conn, session_id, body)
    finally:
        conn.close()


@router.post("/v1/sessions/{session_id}/messages/batch", status_code=201)
def batch(session_id: str, body: list[MessageCreate], settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        session = get_session(conn, session_id)
        if not session:
            return error_response("not_found", "session not found", 404)
        if session.status == "closed":
            return error_response("conflict", "cannot append to a closed session", 409)
        return batch_append(conn, session_id, body)
    finally:
        conn.close()


@router.get("/v1/sessions/{session_id}/messages")
def list_all(
    session_id: str,
    cursor: str | None = Query(None),
    limit: int = Query(50),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.adp_db_path)
    try:
        items, next_cursor = list_messages(conn, session_id, cursor, limit)
        return {"items": items, "next_cursor": next_cursor}
    finally:
        conn.close()

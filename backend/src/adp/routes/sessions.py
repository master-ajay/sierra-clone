from fastapi import APIRouter, Depends, Query

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection
from adp.errors import error_response
from adp.models.session import SessionCreate, SessionUpdate
from adp.services.session_service import (
    close_session,
    create_session,
    get_session,
    list_sessions,
    update_session,
)
from adp.services.user_service import get_user

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/users/{user_id}/sessions", status_code=201)
def create(user_id: str, body: SessionCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        if not get_user(conn, user_id):
            return error_response("not_found", "user not found", 404)
        return create_session(conn, user_id, body)
    finally:
        conn.close()


@router.get("/v1/users/{user_id}/sessions")
def list_all(
    user_id: str,
    status: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(20),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.adp_db_path)
    try:
        items, next_cursor = list_sessions(conn, user_id, status, cursor, limit)
        return {"items": items, "next_cursor": next_cursor}
    finally:
        conn.close()


@router.get("/v1/sessions/{session_id}")
def get_one(session_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        session = get_session(conn, session_id)
        if not session:
            return error_response("not_found", "session not found", 404)
        return session
    finally:
        conn.close()


@router.patch("/v1/sessions/{session_id}")
def update(session_id: str, body: SessionUpdate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        session = update_session(conn, session_id, body)
        if not session:
            return error_response("not_found", "session not found", 404)
        return session
    finally:
        conn.close()


@router.post("/v1/sessions/{session_id}/close")
def close(session_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        session = get_session(conn, session_id)
        if not session:
            return error_response("not_found", "session not found", 404)
        if session.status == "closed":
            return error_response("conflict", "session is already closed", 409)
        return close_session(conn, session_id)
    finally:
        conn.close()

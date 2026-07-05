from fastapi import APIRouter, Depends, HTTPException

from voice.auth import require_api_key
from voice.config import Settings, get_settings
from voice.database import get_connection
from voice.errors import error_response
from voice.models.line import LineCreate, LineUpdate
from voice.services.line_service import create_line, get_line, list_lines, revoke_line, update_line

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/lines", status_code=201)
def create_line_route(data: LineCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        line = create_line(conn, data, settings)
    finally:
        conn.close()
    return line.model_dump()


@router.get("/v1/lines")
def list_lines_route(
    agent_id: str | None = None,
    status: str | None = None,
    cursor: str | None = None,
    limit: int = 20,
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.voice_db_path)
    try:
        items, next_cursor = list_lines(conn, agent_id, status, cursor, limit)
    finally:
        conn.close()
    return {"items": [i.model_dump() for i in items], "next_cursor": next_cursor}


@router.get("/v1/lines/{line_id}")
def get_line_route(line_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        line = get_line(conn, line_id)
    finally:
        conn.close()
    if not line:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Line not found", "details": {}}})
    if line.status == "revoked":
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Line not found", "details": {}}})
    return line.model_dump()


@router.patch("/v1/lines/{line_id}")
def update_line_route(line_id: str, data: LineUpdate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        line = update_line(conn, line_id, data)
    finally:
        conn.close()
    if not line:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Line not found", "details": {}}})
    return line.model_dump()


@router.delete("/v1/lines/{line_id}", status_code=204)
def revoke_line_route(line_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        ok = revoke_line(conn, line_id)
    finally:
        conn.close()
    if not ok:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Line not found", "details": {}}})
    return error_response  # unreachable but satisfies return type; FastAPI returns 204 with no body

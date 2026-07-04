from fastapi import APIRouter, Depends, Request

from voice.auth import require_api_key
from voice.config import Settings, get_settings
from voice.database import get_connection
from voice.models.call import TurnRequest
from voice.services.call_service import end_call, escalate_call, exchange_turn, open_call

router = APIRouter()


@router.post("/v1/lines/{line_id}/calls", status_code=201)
def start_call_route(line_id: str, request: Request, settings: Settings = Depends(get_settings)):
    line_key = request.headers.get("X-Line-Key", "")
    conn = get_connection(settings.voice_db_path)
    try:
        call = open_call(conn, line_id, line_key, settings)
    finally:
        conn.close()
    return {"call_id": call.call_id, "session_id": call.session_id}


@router.post("/v1/calls/{call_id}/turns")
def exchange_turn_route(call_id: str, body: TurnRequest, request: Request, settings: Settings = Depends(get_settings)):
    line_key = request.headers.get("X-Line-Key", "")
    conn = get_connection(settings.voice_db_path)
    try:
        result = exchange_turn(conn, call_id, body.text, line_key, settings)
    finally:
        conn.close()
    return result.model_dump()


@router.post("/v1/calls/{call_id}/end")
def end_call_route(call_id: str, request: Request, settings: Settings = Depends(get_settings)):
    line_key = request.headers.get("X-Line-Key", "")
    conn = get_connection(settings.voice_db_path)
    try:
        result = end_call(conn, call_id, line_key, settings)
    finally:
        conn.close()
    return result


@router.post("/v1/calls/{call_id}/escalate", dependencies=[Depends(require_api_key)])
def escalate_call_route(call_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        result = escalate_call(conn, call_id, settings)
    finally:
        conn.close()
    return result

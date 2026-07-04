import sqlite3

from fastapi import Depends, HTTPException, Request

from voice.config import Settings, get_settings
from voice.database import get_connection


async def require_api_key(request: Request, settings: Settings = Depends(get_settings)) -> None:
    key = request.headers.get("X-API-Key", "")
    if key != settings.voice_api_key:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "unauthorized", "message": "Invalid or missing API key", "details": {}}},
        )


def require_line_key(line_id: str, request: Request, settings: Settings = Depends(get_settings)) -> None:
    line_key = request.headers.get("X-Line-Key", "")
    conn: sqlite3.Connection = get_connection(settings.voice_db_path)
    try:
        row = conn.execute("SELECT line_key, status FROM lines WHERE line_id=?", (line_id,)).fetchone()
    finally:
        conn.close()
    if not row or row["line_key"] != line_key:
        raise HTTPException(
            status_code=401,
            detail={"error": {"code": "unauthorized", "message": "Invalid or missing line key", "details": {}}},
        )

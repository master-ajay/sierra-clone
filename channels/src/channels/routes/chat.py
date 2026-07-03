import httpx
from fastapi import APIRouter, Depends, Request

from channels.config import Settings, get_settings
from channels.database import get_connection
from channels.errors import error_response
from channels.models.chat import ChatRequest
from channels.services.channel_service import get_channel_by_key
from channels.services.chat_service import send_message

router = APIRouter()


@router.post("/v1/channels/{channel_id}/chat")
def chat(channel_id: str, body: ChatRequest, request: Request, settings: Settings = Depends(get_settings)):
    channel_key = request.headers.get("X-Channel-Key", "")
    conn = get_connection(settings.channels_db_path)
    channel = get_channel_by_key(conn, channel_key)
    if not channel or channel.channel_id != channel_id:
        return error_response("unauthorized", "invalid channel key", 401)
    if channel.status == "paused":
        return error_response("channel_unavailable", "channel is paused", 503)
    if channel.status == "revoked":
        return error_response("channel_unavailable", "channel has been revoked", 503)
    try:
        return send_message(conn, channel, body.message, body.session_id, settings)
    except httpx.HTTPStatusError as exc:
        return error_response("upstream_error", f"upstream service error: {exc.response.status_code}", 502)
    except httpx.RequestError:
        return error_response("upstream_error", "upstream service unreachable", 502)

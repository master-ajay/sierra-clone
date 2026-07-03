from fastapi import APIRouter, Depends
from fastapi.responses import Response

from channels.config import Settings, get_settings
from channels.database import get_connection
from channels.errors import error_response
from channels.services.channel_service import get_channel_by_key
from channels.services.widget_service import build_widget_js

router = APIRouter()


@router.get("/v1/channels/{channel_id}/widget.js")
def widget_js(channel_id: str, channel_key: str = "", settings: Settings = Depends(get_settings)):
    # channel_key passed as query param from the script tag's data attribute OR X-Channel-Key header
    conn = get_connection(settings.channels_db_path)
    channel = get_channel_by_key(conn, channel_key) if channel_key else None
    if not channel or channel.channel_id != channel_id:
        return error_response("unauthorized", "invalid channel key", 401)
    if channel.status != "active":
        return error_response("channel_unavailable", "channel is not active", 503)
    chat_url = f"http://localhost:{settings.channels_port}/v1/channels/{channel_id}/chat"
    js = build_widget_js(channel_id, channel_key, chat_url)
    return Response(content=js, media_type="application/javascript")

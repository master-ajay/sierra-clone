from fastapi import APIRouter, Depends, Query

from channels.auth import require_api_key
from channels.config import Settings, get_settings
from channels.database import get_connection
from channels.errors import error_response
from channels.models.channel import ChannelCreate, ChannelUpdate
from channels.services.channel_service import (
    create_channel,
    delete_channel,
    get_channel,
    list_channels,
    update_channel,
)

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/channels", status_code=201)
def create(body: ChannelCreate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    return create_channel(conn, body)


@router.get("/v1/channels")
def list_all(
    agent_id: str | None = Query(None),
    status: str | None = Query(None),
    cursor: str | None = Query(None),
    limit: int = Query(20),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.channels_db_path)
    items, next_cursor = list_channels(conn, agent_id, status, cursor, limit)
    return {"items": items, "next_cursor": next_cursor}


@router.get("/v1/channels/{channel_id}")
def get_one(channel_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    channel = get_channel(conn, channel_id)
    if not channel:
        return error_response("not_found", "channel not found", 404)
    return channel


@router.patch("/v1/channels/{channel_id}")
def update(channel_id: str, body: ChannelUpdate, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    channel = update_channel(conn, channel_id, body)
    if not channel:
        return error_response("not_found", "channel not found", 404)
    return channel


@router.delete("/v1/channels/{channel_id}", status_code=204)
def delete(channel_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    if not delete_channel(conn, channel_id):
        return error_response("not_found", "channel not found", 404)


@router.get("/v1/channels/{channel_id}/stats")
def get_stats(channel_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    if not get_channel(conn, channel_id):
        return error_response("not_found", "channel not found", 404)
    row = conn.execute("SELECT * FROM channel_stats WHERE channel_id=?", (channel_id,)).fetchone()
    return {
        "channel_id": channel_id,
        "total_messages": row["total_messages"],
        "total_sessions": row["total_sessions"],
        "last_active_at": row["last_active_at"],
    }


@router.get("/v1/channels/{channel_id}/snippet")
def get_snippet(channel_id: str, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.channels_db_path)
    channel = get_channel(conn, channel_id)
    if not channel:
        return error_response("not_found", "channel not found", 404)
    base = f"http://localhost:{settings.channels_port}"
    if channel.type == "widget":
        snippet = f'<script src="{base}/v1/channels/{channel_id}/widget.js" data-channel-key="{channel.channel_key}"></script>'
    else:
        snippet = (
            f'curl -X POST {base}/v1/channels/{channel_id}/chat \\\n'
            f'  -H "X-Channel-Key: {channel.channel_key}" \\\n'
            f'  -H "Content-Type: application/json" \\\n'
            f'  -d \'{{"message": "Hello"}}\''
        )
    return {"channel_id": channel_id, "type": channel.type, "snippet": snippet}

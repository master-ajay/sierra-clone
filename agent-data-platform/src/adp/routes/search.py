from fastapi import APIRouter, Depends, Query

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection
from adp.services.search_service import search_messages

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.get("/v1/users/{user_id}/search")
def search(
    user_id: str,
    q: str = Query(...),
    cursor: str | None = Query(None),
    limit: int = Query(20),
    settings: Settings = Depends(get_settings),
):
    conn = get_connection(settings.adp_db_path)
    items, next_cursor = search_messages(conn, user_id, q, cursor, limit)
    return {"items": items, "next_cursor": next_cursor}

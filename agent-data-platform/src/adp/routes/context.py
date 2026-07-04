from fastapi import APIRouter, Depends

from adp.auth import require_api_key
from adp.config import Settings, get_settings
from adp.database import get_connection
from adp.errors import error_response
from adp.models.context import ContextRequest
from adp.services.context_service import assemble_context
from adp.services.user_service import get_user

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/context")
def get_context(body: ContextRequest, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.adp_db_path)
    try:
        if not get_user(conn, body.user_id):
            return error_response("not_found", "user not found", 404)
        return assemble_context(conn, body, settings.adp_max_context_tokens)
    finally:
        conn.close()

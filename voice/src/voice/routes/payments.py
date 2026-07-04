from fastapi import APIRouter, Depends

from voice.auth import require_api_key
from voice.config import Settings, get_settings
from voice.database import get_connection
from voice.models.payment import PaymentRequest
from voice.services.payment_service import record_payment

router = APIRouter(dependencies=[Depends(require_api_key)])


@router.post("/v1/calls/{call_id}/payment")
def payment_route(call_id: str, body: PaymentRequest, settings: Settings = Depends(get_settings)):
    conn = get_connection(settings.voice_db_path)
    try:
        result = record_payment(conn, call_id, body, settings)
    finally:
        conn.close()
    return result.model_dump()

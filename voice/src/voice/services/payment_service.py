import logging
import sqlite3
import uuid
from datetime import datetime, timezone

import httpx
from fastapi import HTTPException

from voice.config import Settings
from voice.models.payment import PaymentRequest, PaymentResponse

logger = logging.getLogger(__name__)


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def record_payment(conn: sqlite3.Connection, call_id: str, req: PaymentRequest, settings: Settings) -> PaymentResponse:
    call_row = conn.execute("SELECT * FROM calls WHERE call_id=?", (call_id,)).fetchone()
    if not call_row:
        raise HTTPException(status_code=404, detail={"error": {"code": "not_found", "message": "Call not found", "details": {}}})

    # Check guardrail with Trust & Reliability
    trust_resp = httpx.post(
        f"{settings.voice_trust_url}/v1/check",
        json={
            "message": f"payment {req.amount} {req.currency} card ...{req.masked_card_last4}",
            "channel_id": call_id,
            "direction": "outbound",
        },
        headers={"X-API-Key": settings.voice_trust_api_key},
    )

    if trust_resp.status_code == 200:
        trust_data = trust_resp.json()
        allowed = trust_data.get("allowed", True)
    else:
        logger.warning("trust_check_failed: call_id=%s status=%d defaulting to blocked", call_id, trust_resp.status_code)
        allowed = False

    status = "collected" if allowed else "blocked"
    payment_id = str(uuid.uuid4())
    now = _now()

    conn.execute(
        "INSERT INTO payment_attempts (payment_id, call_id, masked_card_last4, amount, currency, status, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?)",
        (payment_id, call_id, req.masked_card_last4, req.amount, req.currency, status, now),
    )
    conn.commit()

    response = PaymentResponse(
        payment_id=payment_id,
        call_id=call_id,
        masked_card_last4=req.masked_card_last4,
        amount=req.amount,
        currency=req.currency,
        status=status,
        created_at=now,
    )

    if not allowed:
        raise HTTPException(
            status_code=403,
            detail={
                "error": {"code": "payment_blocked", "message": "Payment blocked by guardrail", "details": response.model_dump()}
            },
        )

    return response

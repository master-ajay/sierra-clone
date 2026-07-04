from pydantic import BaseModel


class PaymentRequest(BaseModel):
    masked_card_last4: str
    amount: float
    currency: str


class PaymentResponse(BaseModel):
    payment_id: str
    call_id: str
    masked_card_last4: str
    amount: float
    currency: str
    status: str
    created_at: str

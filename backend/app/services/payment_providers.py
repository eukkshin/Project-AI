"""Display-only payment methods. No live payment credentials or transactions."""
from typing import Literal
from pydantic import BaseModel

PaymentProviderId = Literal["toss_pay", "kakao_pay", "naver_pay", "payco", "card"]

class PaymentProviderInfo(BaseModel):
    id: PaymentProviderId
    name: str
    status: Literal["planned"] = "planned"
    checkout_enabled: bool = False
    card_registration_enabled: bool = False

PROVIDERS: tuple[PaymentProviderInfo, ...] = (
    PaymentProviderInfo(id="toss_pay", name="토스페이"),
    PaymentProviderInfo(id="kakao_pay", name="카카오페이"),
    PaymentProviderInfo(id="naver_pay", name="네이버페이"),
    PaymentProviderInfo(id="payco", name="PAYCO"),
    PaymentProviderInfo(id="card", name="신용·체크카드"),
)

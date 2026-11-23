"""v2.7 booking provider layer. Only mock provider executes; real paths fail closed."""
from datetime import date, datetime, timezone
from typing import Literal
from uuid import uuid4
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.auth import authenticated_user
from app.core.database import get_db
from app.core.models import BookingDemoExecution, BookingJob, User
from app.services.booking_provider import demo_slots

router = APIRouter(prefix='/api/booking-agent', tags=['booking-agent'])
SEOUL = ZoneInfo('Asia/Seoul')

class AvailabilityQuery(BaseModel):
    restaurant: str = Field(min_length=2, max_length=100)
    date: date
    party_size: int = Field(ge=1, le=12)

class RealBookingRequest(BaseModel):
    booking_id: str
    payment_method: str | None = None
    provider: str | None = None

@router.post('/availability')
def availability(body: AvailabilityQuery):
    try:
        slots = demo_slots(body.restaurant, body.date, body.party_size)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return {
        'provider': 'mock', 'demo_only': True, 'real_inventory': False,
        'restaurant': body.restaurant.strip(), 'date': body.date.isoformat(),
        'party_size': body.party_size, 'timezone': 'Asia/Seoul', 'slots': slots,
        'message': '표시된 시간은 가상 시연 시간이며 실제 식당의 빈자리가 아닙니다.',
    }

@router.get('/payment-gate')
def payment_gate():
    return {
        'real_booking_enabled': False,
        'payment_connected': False,
        'authorized_provider_connected': False,
        'blocked_reasons': [
            '공식 예약 생성 API 권한이 연결되지 않았습니다.',
            '실제 결제수단 인증 및 PG 연동이 없습니다.',
            '실예약 기능은 서버에서 비활성화되어 있습니다.',
        ],
        'demo_booking_available': True,
    }

@router.post('/real/submit', status_code=403)
def submit_real_booking(body: RealBookingRequest, user: User = Depends(authenticated_user)):
    # This is deliberately a hard block. Never pass through to a provider or payment service.
    raise HTTPException(status_code=403, detail='실제 예약은 비활성화되어 있습니다. 공식 예약 API 권한과 결제 인증 연결 후 별도 구현이 필요합니다.')

@router.post('/demo/{booking_id}/execute')
def execute_demo(booking_id: str, user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    job = db.scalar(select(BookingJob).where(BookingJob.id == booking_id, BookingJob.user_id == user.id))
    if job is None:
        raise HTTPException(status_code=404, detail='모의 예약 요청을 찾을 수 없습니다.')
    execution = db.get(BookingDemoExecution, booking_id)
    if execution is not None:
        return {'booking_id': booking_id, 'status': 'demo_confirmed', 'confirmation_code': execution.confirmation_code,
                'demo_only': True, 'real_booking_created': False, 'payment_charged': False, 'idempotent': True}
    if job.status != 'demo_approved':
        raise HTTPException(status_code=409, detail='먼저 사용자 승인을 완료해야 모의 실행할 수 있습니다.')
    visit = datetime.fromisoformat(job.visit_at)
    if visit.tzinfo is None:
        raise HTTPException(status_code=422, detail='예약 시각의 시간대 정보가 없습니다.')
    local = visit.astimezone(SEOUL)
    try:
        slots = demo_slots(job.restaurant, local.date(), job.party_size)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if local.strftime('%H:%M') not in slots:
        raise HTTPException(status_code=409, detail='이 요청의 시간은 현재 가상 시간표에서 선택할 수 없습니다. 새로운 요청을 만들어 주세요.')
    now = datetime.now(timezone.utc).isoformat()
    code = 'DEMO-' + uuid4().hex[:10].upper()
    count = db.execute(update(BookingJob).where(BookingJob.id == booking_id, BookingJob.user_id == user.id,
        BookingJob.status == 'demo_approved').values(status='demo_confirmed', updated_at=now)).rowcount
    if count != 1:
        db.rollback()
        raise HTTPException(status_code=409, detail='다른 요청에서 이미 처리되었습니다.')
    db.add(BookingDemoExecution(booking_id=booking_id, user_id=user.id, confirmation_code=code, completed_at=now))
    db.commit()
    return {'booking_id': booking_id, 'status': 'demo_confirmed', 'confirmation_code': code,
            'demo_only': True, 'real_booking_created': False, 'payment_charged': False, 'idempotent': False}

"""Authenticated, account-scoped *simulation* of booking approval and Web Push."""
import json
import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, update
from sqlalchemy.orm import Session
from app.core.auth import authenticated_user
from app.core.database import get_db
from app.core.models import BookingJob, PushSubscription, User

router = APIRouter(prefix='/api', tags=['booking-demo'])
log = logging.getLogger(__name__)

class DemoRequest(BaseModel):
    restaurant: str = Field(min_length=2, max_length=100)
    visit_at: datetime
    party_size: int = Field(ge=1, le=12)

class SubscriptionRequest(BaseModel):
    endpoint: str = Field(min_length=10, max_length=2000)
    keys: dict[str, str]

def as_dict(job: BookingJob) -> dict:
    return {k: getattr(job, k) for k in ('id','restaurant','visit_at','party_size','status','created_at','updated_at','expires_at')}

async def notify(db: Session, user_id: int, title: str, body: str, booking_id: str):
    private = os.getenv('VAPID_PRIVATE_KEY', '').strip()
    if not private or not os.getenv('VAPID_PUBLIC_KEY', '').strip():
        return
    from pywebpush import webpush
    rows = db.scalars(select(PushSubscription).where(PushSubscription.user_id == user_id)).all()
    for row in rows:
        try:
            webpush(subscription_info=json.loads(row.subscription_json),
                    data=json.dumps({'title': title, 'body': body, 'url': '/group/three/3/bookings/?id='+booking_id}),
                    vapid_private_key=private,
                    vapid_claims={'sub': os.getenv('VAPID_SUBJECT', 'mailto:admin@example.com')}, timeout=8)
        except Exception:
            log.warning('Push delivery failed for subscription, details omitted')

@router.get('/bookings/capabilities')
def capabilities():
    return {'demo_only': True, 'real_booking_enabled': False, 'payment_enabled': False,
            'push_configured': bool(os.getenv('VAPID_PUBLIC_KEY') and os.getenv('VAPID_PRIVATE_KEY')),
            'public_vapid_key': os.getenv('VAPID_PUBLIC_KEY', ''), 'live_activities_available': False}

@router.post('/bookings/demo', status_code=201)
async def create_demo(body: DemoRequest, user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    if body.visit_at.tzinfo is None: raise HTTPException(422, '방문 시각에는 타임존이 필요합니다.')
    now = datetime.now(timezone.utc)
    visit = body.visit_at.astimezone(timezone.utc)
    if not (now < visit <= now + timedelta(days=180)):
        raise HTTPException(422, '방문일은 180일 이내의 미래 날짜여야 합니다.')
    stamp = now.isoformat()
    job = BookingJob(id=str(uuid4()), user_id=user.id, restaurant=body.restaurant.strip(),
                     visit_at=body.visit_at.isoformat(), party_size=body.party_size,
                     status='approval_pending', created_at=stamp, updated_at=stamp,
                     expires_at=(now + timedelta(minutes=30)).isoformat())
    db.add(job)
    db.commit()
    await notify(db, user.id, 'DINOVO · 모의 예약 승인 요청', '예약 내용을 확인해 주세요. 실제 식당 예약은 진행되지 않습니다.', job.id)
    return {'id': job.id, 'status': job.status, 'demo_only': True}

@router.get('/bookings/demo')
def list_demo(user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    jobs = db.scalars(select(BookingJob).where(BookingJob.user_id == user.id).order_by(BookingJob.created_at.desc()).limit(50)).all()
    return {'items': [as_dict(job) for job in jobs], 'demo_only': True}

@router.post('/bookings/demo/{booking_id}/decision')
async def decide(booking_id: str, decision: Literal['approve', 'reject'], user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc).isoformat()
    job = db.scalar(select(BookingJob).where(BookingJob.id == booking_id, BookingJob.user_id == user.id))
    if not job: raise HTTPException(404, '예약 요청을 찾을 수 없습니다.')
    if job.status != 'approval_pending': raise HTTPException(409, '이미 처리된 요청입니다.')
    expired = job.expires_at < now
    status = 'expired' if expired else ('demo_approved' if decision == 'approve' else 'rejected')
    count = db.execute(update(BookingJob).where(BookingJob.id == booking_id, BookingJob.user_id == user.id,
                     BookingJob.status == 'approval_pending').values(status=status,updated_at=now)).rowcount
    if count != 1:
        db.rollback()
        raise HTTPException(409, '이미 처리된 요청입니다.')
    db.commit()
    if expired: raise HTTPException(409, '승인 기한이 만료되었습니다.')
    await notify(db, user.id, 'DINOVO · 모의 예약 처리 완료', '예약 승인 테스트가 완료되었습니다.', booking_id)
    return {'id': booking_id, 'status': status, 'demo_only': True, 'real_booking_created': False}

@router.post('/push/subscribe', status_code=201)
def subscribe(body: SubscriptionRequest, user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    if not body.endpoint.startswith('https://') or not body.keys.get('p256dh') or not body.keys.get('auth'):
        raise HTTPException(422, '유효하지 않은 Web Push 구독입니다.')
    row = db.scalar(select(PushSubscription).where(PushSubscription.endpoint == body.endpoint))
    if row and row.user_id != user.id:
        raise HTTPException(409, '다른 계정에 등록된 기기입니다.')
    if row: row.subscription_json = body.model_dump_json()
    else: db.add(PushSubscription(user_id=user.id, endpoint=body.endpoint, subscription_json=body.model_dump_json()))
    db.commit()
    return {'subscribed': True}

@router.post('/push/test')
async def push_test(user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    await notify(db, user.id, 'DINOVO · 알림 테스트', '예약 승인 알림 연결을 확인하고 있습니다.', 'test')
    return {'sent_attempted': True, 'delivery_guaranteed': False}

"""Account-scoped workspace sync and read-only alert history; SQLite demo persistence."""
import json
from datetime import datetime,timezone
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.auth import authenticated_user
from app.core.database import get_db
from app.core.models import User,UserWorkspace,NotificationEvent

router=APIRouter(prefix='/api/me',tags=['account-data'])

class Favorite(BaseModel):
    name: str = Field(min_length=1,max_length=90)
    createdAt: int = Field(ge=0)

class StoredMessage(BaseModel):
    id: str = Field(max_length=100)
    sender: str = Field(pattern='^(user|assistant)$')
    text: str = Field(max_length=3000)
    createdAt: int

class StoredConversation(BaseModel):
    id: str = Field(max_length=100)
    title: str = Field(max_length=80)
    messages: list[StoredMessage] = Field(default_factory=list,max_length=80)
    updatedAt: int

class Workspace(BaseModel):
    favorites: list[Favorite] = Field(default_factory=list,max_length=100)
    conversations: list[StoredConversation] = Field(default_factory=list,max_length=30)
    save_history: bool = False

@router.get('/workspace')
def get_workspace(user:User=Depends(authenticated_user),db:Session=Depends(get_db)):
    row=db.get(UserWorkspace,user.id)
    return {'workspace':json.loads(row.data_json) if row else Workspace().model_dump(), 'updated_at':row.updated_at if row else None}

@router.put('/workspace')
def put_workspace(body:Workspace,user:User=Depends(authenticated_user),db:Session=Depends(get_db)):
    # Only send chats with explicit opt-in. Never store API keys / payment data.
    safe=body.model_copy(update={'conversations':body.conversations if body.save_history else []})
    raw=safe.model_dump_json()
    if len(raw.encode())>250_000:raise HTTPException(413,'저장할 데이터가 너무 큽니다.')
    row=db.get(UserWorkspace,user.id)
    now=datetime.now(timezone.utc).isoformat()
    if row:row.data_json=raw;row.updated_at=now
    else:db.add(UserWorkspace(user_id=user.id,data_json=raw,updated_at=now))
    db.commit()
    return {'saved':True,'updated_at':now}

@router.get('/notifications')
def notifications(user:User=Depends(authenticated_user),db:Session=Depends(get_db)):
    rows=db.scalars(select(NotificationEvent).where(NotificationEvent.user_id==user.id).order_by(NotificationEvent.id.desc()).limit(50)).all()
    return {'items':[{'id':x.id,'kind':x.kind,'booking_id':x.booking_id,'title':x.title,'body':x.body,
                      'created_at':x.created_at,'read_at':x.read_at} for x in rows]}

@router.post('/notifications/{event_id}/read')
def mark_read(event_id:int,user:User=Depends(authenticated_user),db:Session=Depends(get_db)):
    row=db.scalar(select(NotificationEvent).where(NotificationEvent.id==event_id,NotificationEvent.user_id==user.id))
    if row is None:raise HTTPException(404,'알림을 찾을 수 없습니다.')
    row.read_at=datetime.now(timezone.utc).isoformat()
    db.commit()
    return {'read':True}

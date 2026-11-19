"""Demo email authentication, provider capability disclosure, no fake OAuth login."""
import hashlib
import re
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select, delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.models import User, AuthSession
from app.core.auth import authenticated_user, password_hash, password_verify, issue_session
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

router = APIRouter(prefix='/api/auth', tags=['auth'])
bearer = HTTPBearer(auto_error=False)

class RegisterInput(BaseModel):
    email: str = Field(min_length=5, max_length=320)
    password: str = Field(min_length=10, max_length=128)
    display_name: str = Field(min_length=1, max_length=80)

class LoginInput(BaseModel):
    email: str
    password: str

def normalized_email(value: str) -> str:
    e = value.strip().lower()
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', e):
        raise HTTPException(422, '이메일 형식을 확인해 주세요.')
    return e

def expose_user(user: User):
    return {'id': user.id, 'email': user.email, 'display_name': user.display_name}

@router.post('/register', status_code=201)
def register(body: RegisterInput, db: Session = Depends(get_db)):
    email = normalized_email(body.email)
    user = User(email=email, display_name=body.display_name.strip(), password_hash=password_hash(body.password))
    if not user.display_name: raise HTTPException(422, '닉네임을 입력해 주세요.')
    db.add(user)
    try: db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, '이미 등록된 이메일입니다.')
    db.refresh(user)
    return {'user': expose_user(user), **issue_session(db, user)}

@router.post('/login')
def login(body: LoginInput, db: Session = Depends(get_db)):
    email = normalized_email(body.email)
    user = db.scalar(select(User).where(User.email == email))
    if not user or not user.password_hash or not password_verify(body.password, user.password_hash):
        raise HTTPException(401, '이메일 또는 비밀번호가 올바르지 않습니다.')
    return {'user': expose_user(user), **issue_session(db, user)}

@router.get('/me')
def me(user: User = Depends(authenticated_user)):
    return {'user': expose_user(user)}

@router.post('/logout')
def logout(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), user: User = Depends(authenticated_user), db: Session = Depends(get_db)):
    hashed = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.id, AuthSession.token_hash == hashed))
    db.commit()
    return {'logged_out': True}

@router.get('/providers')
def providers():
    # Provider logins require a complete authorization-code/PKCE and callback flow.
    # Client IDs are not proof of a working OAuth integration.
    return {'providers': [{'id': p, 'enabled': False, 'status': 'planned'} for p in ('kakao','naver','google','apple')]}

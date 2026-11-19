"""Opaque expiring bearer tokens and scrypt password hashes. No JWT secrets needed."""
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.models import User, AuthSession

bearer = HTTPBearer(auto_error=False)

def password_hash(password: str) -> str:
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode('utf-8'), salt=salt, n=2**14, r=8, p=1)
    return f'scrypt$16384$8$1${salt.hex()}${digest.hex()}'

def password_verify(password: str, stored: str) -> bool:
    try:
        kind,n,r,p,salt,digest = stored.split('$')
        if kind != 'scrypt': return False
        check = hashlib.scrypt(password.encode('utf-8'), salt=bytes.fromhex(salt), n=int(n), r=int(r), p=int(p))
        return hmac.compare_digest(check, bytes.fromhex(digest))
    except (ValueError, TypeError):
        return False

def issue_session(db: Session, user: User) -> dict:
    token = secrets.token_urlsafe(48)
    expire = datetime.now(timezone.utc) + timedelta(days=7)
    db.add(AuthSession(user_id=user.id, token_hash=hashlib.sha256(token.encode()).hexdigest(), expires_at=expire))
    db.commit()
    return {'access_token': token, 'token_type': 'bearer', 'expires_at': expire.isoformat()}

def authenticated_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)) -> User:
    if not credentials or credentials.scheme.lower() != 'bearer':
        raise HTTPException(status_code=401, detail='로그인이 필요합니다.')
    hashed = hashlib.sha256(credentials.credentials.encode()).hexdigest()
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == hashed))
    if session is None or session.expires_at.replace(tzinfo=timezone.utc) <= datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail='로그인 세션이 만료되었습니다.')
    user = db.get(User, session.user_id)
    if user is None:
        raise HTTPException(status_code=401, detail='사용자 계정을 찾을 수 없습니다.')
    return user

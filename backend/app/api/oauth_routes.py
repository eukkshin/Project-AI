"""OAuth authorization-code login. One-use state and exchange ticket; no tokens in redirect URLs."""
import hashlib
import os
import secrets
from datetime import datetime,timedelta,timezone
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter,Depends,HTTPException,Request
from fastapi.responses import RedirectResponse
from sqlalchemy import select,delete
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from pydantic import BaseModel,Field

from app.core.database import get_db
from app.core.models import OAuthFlow,OAuthTicket,SocialAccount,User
from app.core.auth import issue_session
from app.api.auth_routes import expose_user

router=APIRouter(prefix='/api/auth/oauth',tags=['auth'])
PROVIDERS={
 'google':{'auth':'https://accounts.google.com/o/oauth2/v2/auth','token':'https://oauth2.googleapis.com/token','profile':'https://openidconnect.googleapis.com/v1/userinfo','scope':'openid email profile'},
 'kakao':{'auth':'https://kauth.kakao.com/oauth/authorize','token':'https://kauth.kakao.com/oauth/token','profile':'https://kapi.kakao.com/v2/user/me','scope':'profile_nickname'},
 'naver':{'auth':'https://nid.naver.com/oauth2.0/authorize','token':'https://nid.naver.com/oauth2.0/token','profile':'https://openapi.naver.com/v1/nid/me','scope':''},
}

def credentials(provider:str)->tuple[str,str]:
    return (os.getenv(f'{provider.upper()}_CLIENT_ID','').strip(),os.getenv(f'{provider.upper()}_CLIENT_SECRET','').strip())

def provider_enabled(provider:str)->bool:
    return provider in PROVIDERS and all(credentials(provider)) and bool(os.getenv('PUBLIC_API_ORIGIN'))

def base_urls():
    api=os.getenv('PUBLIC_API_ORIGIN','').strip().rstrip('/')
    frontend=os.getenv('FRONTEND_ORIGIN','http://localhost:3000').strip().rstrip('/')
    if not (api.startswith('https://') or api in {'http://localhost:8000','http://127.0.0.1:8000'}):
        raise HTTPException(503,'OAuth에는 HTTPS 또는 localhost 주소가 필요합니다.')
    if not (frontend.startswith('https://') or frontend.startswith('http://localhost:') or frontend.startswith('http://127.0.0.1:')):
        raise HTTPException(503,'프론트엔드에도 HTTPS가 필요합니다.')
    return api,frontend

def digest(value:str):return hashlib.sha256(value.encode()).hexdigest()

def utc():return datetime.now(timezone.utc)

def callback_url(provider:str):return f'{base_urls()[0]}/api/auth/oauth/{provider}/callback'

@router.get('/{provider}/start')
def start(provider:str,db:Session=Depends(get_db)):
    if not provider_enabled(provider):raise HTTPException(503,'이 소셜 로그인은 현재 미연동 상태입니다.')
    config=PROVIDERS[provider];client_id,_=credentials(provider)
    state=secrets.token_urlsafe(32)
    db.add(OAuthFlow(state_hash=digest(state),provider=provider,expires_at=(utc()+timedelta(minutes=5)).isoformat()))
    db.commit()
    params={'response_type':'code','client_id':client_id,'redirect_uri':callback_url(provider),'state':state}
    if config['scope']:params['scope']=config['scope']
    response=RedirectResponse(config['auth']+'?'+urlencode(params),status_code=302)
    response.set_cookie('dinovo_oauth_state',state,max_age=300,httponly=True,secure=base_urls()[0].startswith('https://'),samesite='lax',path='/api/auth/oauth')
    response.headers['Cache-Control']='no-store'
    return response

async def get_profile(provider:str,access_token:str)->tuple[str,str,str | None]:
    config=PROVIDERS[provider]
    async with httpx.AsyncClient(timeout=12,follow_redirects=False) as client:
        response=await client.get(config['profile'],headers={'Authorization':f'Bearer {access_token}'})
        response.raise_for_status()
        body=response.json()
    if provider=='google':
        if not body.get('sub'):raise ValueError('Google profile missing sub')
        return str(body['sub']),str(body.get('name') or 'DINOVO 회원')[:80],body.get('email') if body.get('email_verified') else None
    if provider=='kakao':
        if not body.get('id'):raise ValueError('Kakao profile missing id')
        account=body.get('kakao_account') or {}
        profile=account.get('profile') or {}
        email=account.get('email') if account.get('is_email_verified') is True else None
        return str(body['id']),str(profile.get('nickname') or '카카오 회원')[:80],email
    p=body.get('response') or {}
    if body.get('resultcode')!='00' or not p.get('id'):raise ValueError('Naver profile invalid')
    return str(p['id']),str(p.get('name') or p.get('nickname') or '네이버 회원')[:80],p.get('email')

@router.get('/{provider}/callback')
async def callback(provider:str,request:Request,code:str='',state:str='',error:str='',db:Session=Depends(get_db)):
    if not provider_enabled(provider):raise HTTPException(404,'연동되지 않은 제공자입니다.')
    api,frontend=base_urls()
    cookie=request.cookies.get('dinovo_oauth_state','')
    row=db.get(OAuthFlow,digest(state)) if state else None
    if not cookie or not secrets.compare_digest(cookie,state) or not row or row.provider!=provider or row.expires_at<=utc().isoformat():
        raise HTTPException(400,'소셜 로그인 인증 상태가 유효하지 않습니다.')
    db.delete(row);db.commit()
    if error or not code:raise HTTPException(400,'소셜 로그인이 취소되었거나 실패했습니다.')
    cfg=PROVIDERS[provider];client_id,secret=credentials(provider)
    try:
        async with httpx.AsyncClient(timeout=12,follow_redirects=False) as client:
            params={'grant_type':'authorization_code','code':code,'client_id':client_id,'client_secret':secret,'redirect_uri':callback_url(provider)}
            r=await client.post(cfg['token'],data=params)
            r.raise_for_status()
            access_token=r.json()['access_token']
        provider_user_id,name,email=await get_profile(provider,access_token)
    except Exception as exc:
        raise HTTPException(502,'소셜 로그인 제공자 인증에 실패했습니다.') from exc
    social=db.scalar(select(SocialAccount).where(SocialAccount.provider==provider,SocialAccount.provider_user_id==provider_user_id))
    if social:
        user=db.get(User,social.user_id)
    else:
        # Never silently merge accounts based on email. A distinct provider ID owns this identity.
        synthetic=f'{provider}-{digest(provider_user_id)[:28]}@oauth.dinovo.invalid'
        # A verified provider email can be displayed, but never merges an existing account.
        candidate=(email or '').strip().lower()
        stored_email=candidate if candidate and db.scalar(select(User.id).where(User.email==candidate)) is None else synthetic
        user=User(email=stored_email,display_name=name or 'DINOVO 회원',password_hash=None)
        db.add(user);db.flush()
        db.add(SocialAccount(user_id=user.id,provider=provider,provider_user_id=provider_user_id))
        try:db.commit()
        except IntegrityError:
            db.rollback();raise HTTPException(409,'이미 연결된 소셜 계정입니다.')
    if user is None:raise HTTPException(404,'연결된 계정을 찾을 수 없습니다.')
    ticket=secrets.token_urlsafe(32)
    db.add(OAuthTicket(ticket_hash=digest(ticket),user_id=user.id,expires_at=(utc()+timedelta(seconds=90)).isoformat()))
    db.commit()
    response=RedirectResponse(f'{frontend}/group/three/3/oauth/complete/?ticket={ticket}',status_code=303)
    response.delete_cookie('dinovo_oauth_state',path='/api/auth/oauth')
    response.headers['Cache-Control']='no-store'
    response.headers['Referrer-Policy']='no-referrer'
    return response

class TicketInput(BaseModel):
    ticket:str=Field(min_length=20,max_length=200)

@router.post('/exchange')
def exchange(body:TicketInput,db:Session=Depends(get_db)):
    row=db.get(OAuthTicket,digest(body.ticket))
    if row is None or row.expires_at<=utc().isoformat():raise HTTPException(401,'소셜 로그인 확인 시간이 만료되었습니다.')
    user=db.get(User,row.user_id)
    db.delete(row);db.commit()
    if user is None:raise HTTPException(404,'사용자가 존재하지 않습니다.')
    return {'user':expose_user(user),**issue_session(db,user)}

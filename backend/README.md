# DINOVO (임시명) — AI 미식 컨시어지 MVP

**Next.js 16 + TypeScript / Python 3.10+ FastAPI / Groq GPT-OSS / Kakao Local·Maps**

현재 프로젝트를 토대로 만든 **실제 데이터 연동형 MVP 전체 소스**입니다. `frontend` 와 `backend` 는 각각 독립 실행합니다. 프론트엔드에 Python을 넣지 않습니다. 백엔드 코드는 PyCharm에서 열 수 있습니다.

## 폴더 구조

```
DINOVO/
├─ frontend/   # Next.js + React + Redux Toolkit / 사용자 화면
│  ├─ app/     # 홈, 채팅, 탐색, 컬렉션, 미식 다이어리, 가이드, 기록
│  ├─ components/
│  ├─ store/    # Redux 상태
│  └─ lib/      # FastAPI REST 호출, 지도, 브라우저 저장
└─ backend/    # Python FastAPI + Pydantic + Groq + Kakao Local
   ├─ app/main.py
   ├─ app/api/routes.py
   ├─ app/services/groq_ai.py
   ├─ app/services/kakao.py
   └─ app/data/verified_links.json
```

## 1. Python 백엔드 (PyCharm Terminal)

**경로**: `backend` 를 PyCharm 프로젝트로 열기. Python 3.10 이상 권장.

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

`.env`를 편집하여 발급받은 키를 입력합니다:

```dotenv
GROQ_API_KEY=본인_Groq_키
GROQ_MODEL=openai/gpt-oss-120b
KAKAO_REST_API_KEY=본인_Kakao_REST_API_키
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

다음 명령어로 실행:

```powershell
uvicorn app.main:app --reload --port 8000
```

- API 문서: http://localhost:8000/docs
- 설정 상태 확인: http://localhost:8000/api/health
- `POST /api/chat`: `{"message":"노원구 파스타집 찾아줘","district":"노원구","history":[]}`
- `GET /api/restaurants/search?query=파스타&district=노원구&category=restaurant`

Groq 키 없으면 AI 대화는 503, Kakao REST 키 없으면 장소 검색은 503을 반환합니다. **가짜 식당을 생성하지 않습니다.**

## 2. Next.js 프론트엔드 (VS Code Terminal)

**경로**: `frontend` 폴더를 VS Code에서 엽니다.

```powershell
cd frontend
npm install
Copy-Item .env.example .env.local
npm run dev
```

`.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=본인_Kakao_JavaScript_키
NEXT_PUBLIC_BRAND_NAME=DINOVO
```

- 접속: http://localhost:3000
- Kakao Developers에서 지도 사용을 활성화하고, **JavaScript SDK 도메인**에 `http://localhost:3000`을 등록합니다.
- Kakao JavaScript SDK 키는 프론트에서 공개되는 설계이므로 **도메인 제한**을 적용합니다. REST API 키는 Python 백엔드에서만 사용합니다.
- 이 프로젝트는 Tailwind/PostCSS를 쓰지 않습니다. 기존 `@tailwindcss/postcss` 설정 파일을 복사하지 마세요.
- Node.js는 Next.js 16이 지원하는 버전을 사용하세요. 로컬에서 `npm run build`로 빌드 확인이 필요합니다.

## 구현한 기능

- 홈: 미식 검색 히어로, 주제별 빠른 질문
- AI 컨시어지: 대화, 멀티턴 컨텍스트, 이전 대화, 오류·재시도·취소, 답변 복사, 추천 질문
- 식당 탐색: 카카오 장소 검색, 카테고리 필터, 현재 위치 기반 반경 검색(동의 필요), 카드·지도 연동, 최대 3곳 비교
- 내 컬렉션: 사용자가 북마크한 식당 이름(최소 정보)을 브라우저에 저장
- 미식 다이어리: 사용자 직접 작성한 식당명·날짜·개인 평점·메모 저장
- 미식 가이드: 주제별 AI 미식 검색 유도
- 디자인: 미니멀 라이트·다크·시스템 테마 전환, 모바일 반응형
- 카카오맵: JavaScript 키가 없으면 정보 안내, **가짜 지도 없음**
- 저장 정책: 대화는 기본 비저장, 설정에서 동의 시 브라우저에 메시지만 저장; 검색된 Kakao 응답 목록·좌표는 대화 기록 로컬 저장에 포함하지 않음

## 예약·웨이팅 URL 연결 (공식 검증 링크만)

`backend/app/data/verified_links.json`은 기본 `[]` 입니다. 실제 **해당 식당의 예약·웨이팅 링크를 운영자가 독립적으로 확인한 경우에만** 아래와 같은 항목을 작성합니다(아래 예시는 설명일 뿐, 실제 업체가 아닙니다).

```json
[
  {
    "name": "운영자가 직접 확인한 식당명",
    "address": "운영자가 직접 확인한 주소 (Kakao 표시 주소와 완전히 일치)",
    "booking_url": "https://예약서비스의_실제_식당별_예약_URL",
    "waitlist_url": "",
    "verified": true
  }
]
```

별도로 관리하는 예약 연결 정보와 검색 결과의 이름·주소가 **둘 다 정확히 일치**할 때만 링크가 보입니다. 일반 홈페이지 URL이나 서비스 메인 홈페이지를 '예약 링크'로 위장하지 않습니다. **잔여 좌석, 웨이팅 팀 수, 예약 확정·취소·변경은 구현하지 않았습니다**(공식 제휴 API 필요).

## 실제 서비스 배포 전 확인

1. Kakao API 약관과 장소 데이터의 저장·가공·AI 이용 범위 확인 (북마크·개인 기록의 처리 방침 포함)
2. Groq·Kakao 사용량/쿼터, 실서비스 보안(속도 제한·서버 인증·관측/알림) 도입
3. 사용자 개인정보·위치 처리 및 보존·삭제 방침 마련
4. 예약 제휴·실시간 예약 API 접근 권한 확보 및 공식 승인
5. 브라우저 데이터는 다른 기기와 공유되지 않음. 멀티디바이스 동기화와 회원가입은 DB/인증 도입 후 구현

## 테스트 현황

- Python 소스 문법 검사 통과
- FastAPI `TestClient` 모의 요청 테스트 통과: 요청 유효성, 키 누락 오류, 표준 API JSON 반환
- Next.js의 TS/TSX 34개 소스 파싱 검사 통과
- **실제 `next build` 및 외부 Groq/Kakao API 호출은 이 개발 환경에서 완료되지 않아, 로컬 실행 후 확인 필요**

## 브랜드 변경

`frontend/.env.local`의 `NEXT_PUBLIC_BRAND_NAME`을 선택한 이름으로 변경하면 상단 브랜드명이 바뀝니다. 문서 제목·아이콘·서버 제목은 최종 이름 확정 후 변경할 수 있습니다. 현재 DINOVO는 개발용 임시 이름이며 상표 등록 가능 여부를 보증하지 않습니다.

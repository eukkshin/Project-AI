# 동네 AI — Next.js 프론트엔드 (라이트/다크 미니멀 리뉴얼)

기존 `next-frontend.zip`의 Next.js App Router + TypeScript + Redux Toolkit 기반 코드를 정리하여 만든 **프론트엔드 전체 교체본**입니다. 디자인은 화이트/차콜 모노톤과 슬레이트 블루 포인트를 적용했습니다.

## 1. 실행하기

> 이 압축파일은 `package.json` 등을 포함하는 독립 실행형 Next.js 프로젝트입니다. 기존 프로젝트를 반드시 백업한 뒤 **내용물을 프로젝트 루트에 병합/교체**하세요. Python FastAPI 폴더에는 덮어쓰지 마세요.

1. Node.js 20.9 이상을 설치합니다(현재 개발 환경에서 사용 중인 Node.js 22도 사용 가능).
2. 압축 해제 후 프론트엔드 루트에서 `npm install`을 실행합니다.
3. `.env.example`을 같은 경로의 `.env.local`로 복사합니다.
4. Python 서버를 `uvicorn main:app --reload --port 8000`으로 실행합니다.
5. 프론트엔드에서 `npm run dev`를 실행하고 `http://localhost:3000`에 접속합니다.
6. `npm run build`와 `npm run typecheck`로 최종 검증합니다.

## 2. 환경변수

`frontend/.env.local` (예시)

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY=
```

- `NEXT_PUBLIC_API_BASE_URL`: 브라우저가 요청할 FastAPI 기본 URL입니다. **백엔드**는 `POST /api/chat`을 지원해야 하며, CORS에 `http://localhost:3000`이 허용되어야 합니다.
- `NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY`: **지도 표시용 공개 JavaScript 키**입니다. 이 키가 없으면 지도 자리에는 설정 안내만 나타나지만 채팅과 장소 목록은 사용할 수 있습니다.
- `KAKAO_REST_API_KEY`: **Python FastAPI `.env`에서만** 사용합니다. `NEXT_PUBLIC_` 접두사로 브라우저에 노출하면 안 됩니다.
- Groq API 키 역시 Python 서버에만 둡니다.
- `.env.local` 변경 후 Next.js 개발 서버를 재시작합니다.

**카카오 지도 설정:** 카카오 개발자 콘솔에서 지도 API 사용 설정과 JavaScript 키 SDK 도메인(`http://localhost:3000`) 등록을 확인하세요. 카카오 API 사용량/쿼터·유료 조건은 계정 및 앱에 따라 다를 수 있으므로 실제 연결 전에 확인해야 합니다. 결제/유료 설정은 임의로 진행하지 않습니다.

## 3. 백엔드 통신 규격

```json
POST /api/chat
{
  "message": "노원구에서 조용한 카페 찾아줘",
  "district": "노원구",
  "history": [{"role":"user", "content":"안녕하세요"}]
}
```

응답 예시는 다음과 같습니다. 주소·좌표·업체명·별점 등은 임의로 생성하지 않아야 합니다.

```json
{
  "reply": "검색된 장소를 안내드릴게요.",
  "show_map": false,
  "places": [],
  "suggested_questions": []
}
```

현재 전달된 `local_ai_backend/main.py`의 `ChatRequest` 및 `ChatResponse` 규격과 호환됩니다. 장소 데이터가 존재할 때에만 지도와 장소 카드를 표시합니다. 프론트엔드는 장소 응답의 이름·주소·위경도를 검증한 후 렌더링합니다.

## 4. 구현 범위

- **테마:** 라이트/다크 즉시 전환, 시스템 설정, 브라우저 저장, 화면 색상 토큰 적용.
- **채팅:** 새 대화, 최근 대화 이동, 대화 삭제, 프롬프트 카테고리, 멀티턴 이력 전달, 입력 검증, Enter 전송/Shift+Enter 줄바꿈, 로딩, 오류 및 재시도, 요청 취소, XSS를 억제한 Markdown 렌더링.
- **장소:** 실제 백엔드 응답만 출력, 장소 상세 링크, 즐겨찾기, 지도 핀 선택 연동.
- **모바일:** 사이드 메뉴, 채팅↔지도 전환, 작은 화면에서도 카드/입력창 사용 가능.
- **개인정보:** 대화의 브라우저 저장은 기본 **꺼짐**. 설정에서 동의하면 이 브라우저에만 저장됩니다. 즐겨찾기는 로컬 저장이며 서버에 동기화되지 않습니다.
- **한계:** FastAPI가 스트리밍을 제공하지 않으므로 토큰별 스트리밍은 이번에 넣지 않았습니다. 로그인/DB 동기화/음성인식, 별점/사진/영업시간은 별도 API/데이터 소스가 필요하여 가짜 데이터 대신 제외했습니다.

## 5. 디렉터리

```text
app/          Next App Router 엔트리/메타데이터/디자인 토큰
components/   레이아웃, 채팅, 장소, 실제 카카오 지도, 설정
hooks/        Redux typed hooks, 채팅 비동기 흐름
lib/          API 요청/검증, 카카오 SDK, 타입, 로컬 저장
store/        Redux Toolkit 채팅 세션 상태
```

## 6. 수동 테스트 체크리스트

- API 키 없이 라이트/다크/시스템 테마 설정, 새로고침 후 유지.
- `http://localhost:8000/docs`의 `/api/chat`이 정상인지 확인.
- 일반 대화 입력 후 응답, 질문 2회 이상 시 `history` 유지.
- 백엔드 종료 후 오류 메시지/다시 시도 버튼, 과도한 중복 요청 차단.
- 지도 JS 키가 없으면 안내 표시; 키가 있을 때는 **실제 검색된 장소**에만 마커 생성.
- 즐겨찾기 저장/해제 후 새로고침; 대화 저장 설정 on/off 및 삭제 확인.
- 모바일(너비 375px, 768px) 채팅·지도 표시, 키보드 이용, 테마 전환.

## 검증 범위

업로드된 원본에 `package.json`/잠금 파일이 없어 최소 구성으로 새로 추가했습니다. 소스 TypeScript/TSX 구문 검사를 수행했으며, 이 작성 환경은 npm 레지스트리에 접속할 수 없어 의존성 설치 및 Next.js 실빌드 검증은 진행하지 못했습니다. 사용자 환경에서 위 명령으로 검증해 주세요.

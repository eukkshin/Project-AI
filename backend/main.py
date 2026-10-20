'''
fastapi: 빠르고 간편한 파이썬 프레임워크
uvicorn: 서버를 실행 시켜주는 도구
pydantic: 프론트엔드에서 넘어온 메세지 형식이 맞는지 검사
'''
import os
from dotenv import load_dotenv

'''
FastAPI 라이브러리에서 FastAPI 클래스를 가져오고
파이썬으로 API 서버를 빠르게 만들 수 있게 해주는 도구
'''
from fastapi import FastAPI

'''
CORS 미들웨어를 가져온다
미들웨어 = 요청과 응답 사이에서 중간처리 담당하는 기능
다른 주소에서 오는 요청을 허용할지 말지 결정하는 보안정책
'''
from fastapi.middleware.cors import CORSMiddleware

'''
pydantic 라이브러리에서 BaseModel 클래스 가져옴
'''
from pydantic import BaseModel
from typing import List  # ⭐️ 리스트 타입을 쓰기 위해 추가
from groq import Groq

# 환경 변수 로드
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# 만약 API 키가 설정되어 있지 않다면 경고 출력
if not GROQ_API_KEY:
    print("⚠️ Warning: cannot find GROQ_API_KEY from .env file")

# 발급받은 API 키를 사용하여 Groq 클라이언트 생성
client = Groq(api_key=GROQ_API_KEY)

'''
FastAPI 앱(서버) 인스턴스 생성
모든 설정 및 API는 이 app에 등록됨
'''
app = FastAPI()

# app에 cors 미들웨어 추가
app.add_middleware(
    CORSMiddleware,
    # 요청을 허용할 프론트엔드 주소목록 (Streamlit과 React 주소 모두 허용)
    allow_origins=["http://localhost:3000", "http://localhost:8501"],
    # 쿠키나 인증정보를 요청에 포함 허용
    allow_credentials=True,
    # 허용할 http메서드를 지정
    allow_methods=["*"],
    # 허용할 http헤더를 지정
    allow_headers=["*"],
)

# ⭐️ 1. 대화 하나 하나의 규격을 먼저 정의합니다.
class MessageItem(BaseModel):
    role: str
    content: str

# ⭐️ 2. 프론트엔드에서 전체 대화 리스트(List)를 한 번에 받도록 구조 변경
class ChatRequest(BaseModel):
    messages: List[MessageItem]  # Streamlit에서 보낸 대화 내역 전체를 받음

# 서버가 프론트엔드로 보내는 응답(Response) 데이터 구조를 정의
class ChatResponse(BaseModel):
    reply: str

# 💡 AI의 정체성이나 규칙을 정하는 시스템 프롬프트
SYSTEM_PROMPT = "당신은 친절하고 전문적인 AI 어시스턴트입니다. 사용자의 질문에 한국어로 친절하게 답변해주세요."

'''/api/chat 경로로 POST요청이 들어왔을때 실행될 함수 등록'''
@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        # ⭐️ 3. 프론트엔드에서 넘어온 대화 내역을 가져옵니다.
        # request.messages 안에는 Pydantic 객체들이 있으므로, Groq에 전달하기 위해 순수 딕셔너리로 변환합니다.
        formatted_messages = [
            {"role": msg.role, "content": msg.content} for msg in request.messages
        ]

        # 최신 질문 출력해서 확인해보기
        last_user_message = formatted_messages[-1]["content"] if formatted_messages else ""
        print(f"[수신] 누적 대화 수: {len(formatted_messages)}개 / 최신 질문: {last_user_message} -> Groq 요청 중…")

        # ⭐️ 4. Groq에 보낼 전체 메시지 창고를 조합합니다.
        # 시스템 프롬프트를 가장 맨 위에 얹고, 그 뒤로 과거 대화 기록을 쭉 이어 붙입니다.
        full_conversation = [{"role": "system", "content": SYSTEM_PROMPT}] + formatted_messages

        chat_completion = client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=full_conversation,  # ⭐️ 통째로 조립된 대화 맥락을 전달
            temperature=0.6,
        )

        # AI가 생성한 진짜 답변 텍스트 꺼내기
        ai_reply = chat_completion.choices[0].message.content
        print("⚡ [완료] Groq 맥락 반영 응답 성공")

        return ChatResponse(reply=ai_reply)

    except Exception as e:
        print(f"❌ [에러] Groq AI 호출 중 에러 발생: {e}")
        error_reply = "죄송합니다. 현재 AI 응답을 가져오는 중 문제가 발생했습니다. 서버 콘솔이나 .env 설정을 확인해 주세요."
        return ChatResponse(reply=error_reply)

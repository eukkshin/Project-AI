
import os
import json
from typing import List
from dotenv import load_dotenv

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from groq import AsyncGroq


# ==========================================
# 1. 환경 변수 및 Groq 설정
# ==========================================

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY가 .env에 설정되지 않았습니다.")

client = AsyncGroq(api_key=GROQ_API_KEY)


# ==========================================
# 2. FastAPI 서버 설정
# ==========================================

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8501",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 3. 요청 데이터 모델
# ==========================================

class MessageItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    # 프론트엔드가 body: JSON.stringify({ messages: userQuery }) 로 보내는 단일 문자열을 받습니다.
    messages: str


# ==========================================
# 4. 장소 데이터 모델
# ==========================================

class PlaceInfo(BaseModel):
    name: str
    category: str
    address: str
    lat: float
    lng: float
    is_registered: bool = False
    description: str = ""


# ==========================================
# 5. 응답 데이터 모델
# ==========================================

class ChatResponse(BaseModel):
    reply: str
    show_map: bool = False
    places: List[PlaceInfo] = Field(default_factory=list)


# ==========================================
# 6. AI 시스템 프롬프트
# ==========================================

SYSTEM_PROMPT = """
당신은 사용자에게 친절하고 정확하게 답변하는 AI 도우미입니다.

사용자의 이전 대화 맥락을 고려하여 답변하세요.

반드시 다음 JSON 구조로 응답하세요.

{
  "reply": "사용자에게 보여줄 답변",
  "show_map": false,
  "places": []
}

규칙:

1. reply
- 사용자의 질문에 자연스럽고 친절하게 답변합니다.
- 마크다운 문법을 사용할 수 있습니다.

2. show_map
- 맛집, 카페, 학원, 식당, 관광지 등
  실제 장소 추천이 필요한 경우 true로 설정합니다.
- 일반적인 대화에서는 false로 설정합니다.

3. places
- 장소 추천 시 장소 정보를 배열에 담습니다.
- 일반 대화에서는 빈 배열을 반환합니다.

각 장소의 구조:

{
  "name": "업체명",
  "category": "카테고리",
  "address": "주소",
  "lat": 37.6551,
  "lng": 127.0614,
  "is_registered": true,
  "description": "장소 특징"
}

중요:
- 실제 존재 여부가 불확실한 업체를 만들어내지 마세요.
- 정확하지 않은 주소나 좌표를 지어내지 마세요.
- 장소 정보가 불확실하면 places를 빈 배열로 반환하세요.
- JSON 이외의 텍스트를 출력하지 마세요.
"""


# ==========================================
# 7. AI 채팅 API
# ==========================================

@app.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):

    try:
        # 프론트엔드에서 보낸 단일 입력 문자열 추출
        user_content = request.messages

        if not user_content.strip():
            raise HTTPException(
                status_code=400,
                detail="대화 메시지가 비어 있습니다."
            )

        # 시스템 프롬프트 + 유저의 단일 최신 메시지 구성
        full_conversation = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": user_content
            }
        ]

        print(f"[수신] 유저 신규 메시지: {user_content}")

        # Groq AI 호출 (기존 코드 유지)
        chat_completion = await client.chat.completions.create(
            model="openai/gpt-oss-120b",
            messages=full_conversation,
            temperature=0.6,
            response_format={"type": "json_object"},
        )

        # AI 응답 가져오기
        raw_content = chat_completion.choices[0].message.content

        if not raw_content:
            raise ValueError("AI 응답이 비어 있습니다.")

        # JSON 문자열을 파이썬 딕셔너리로 변환
        parsed_data = json.loads(raw_content)

        # AI 응답에서 각 데이터 추출
        ai_reply = parsed_data.get("reply", "답변을 생성하지 못했습니다.")
        show_map_flag = parsed_data.get("show_map", False)
        places = parsed_data.get("places", [])

        # Pydantic으로 응답 데이터 검증
        response = ChatResponse(
            reply=ai_reply,
            show_map=show_map_flag,
            places=places
        )

        print("⚡ [완료] Groq AI 응답 성공")
        return response

    except HTTPException:
        raise

    except Exception as e:
        print(f"❌ [에러] Groq AI 호출 실패: {e}")
        ai_reply = "죄송합니다. 현재 AI 응답을 가져오는 중 문제가 발생했습니다"
        return ChatResponse(
            reply=ai_reply,
            show_map=False,
            places=[]
        )

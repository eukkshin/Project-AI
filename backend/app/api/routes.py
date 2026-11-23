"""Stable endpoints for Next.js client."""
import logging
import re
from fastapi import APIRouter, HTTPException, Query
from app.core.config import settings
from app.schemas.dining import ChatRequest, ChatResponse, RestaurantResult, Category
from app.services.groq_ai import parse_intent, describe_results
from app.services.search_strategy import search_dining_places
from app.services.verified_links import enrich_verified_links

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api")
DISTRICT_PREFIX = re.compile(r"^\s*\[([^\]]{1,24})\]\s*")

@router.get("/health")
async def health():
    return {"status": "ok", "groq_configured": bool(settings.groq_api_key), "kakao_configured": bool(settings.kakao_key)}

@router.get("/restaurants/search", response_model=RestaurantResult)
async def restaurant_search(
    query: str = Query(min_length=1, max_length=80),
    district: str = Query(default="", max_length=30),
    category: Category = "all",
    lat: float | None = Query(default=None, ge=-90, le=90),
    lng: float | None = Query(default=None, ge=-180, le=180),
    radius: int = Query(default=5000, ge=1, le=20000),
    sort: str = Query(default="accuracy", pattern="^(accuracy|distance)$"),
):
    if (lat is None) != (lng is None):
        raise HTTPException(422, "lat과 lng는 함께 지정해야 합니다.")
    places = enrich_verified_links(await search_dining_places(query, district, category, question=query, lat=lat, lng=lng, radius=radius, sort=sort, limit=12))
    return RestaurantResult(query=query, district=district, places=places)

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    # Previous frontend sent '[노원구] 질문'. Accept it without duplicating the district.
    match = DISTRICT_PREFIX.match(request.question)
    if match:
        request = request.model_copy(update={
            "message": request.question[match.end():].strip(), "messages": None,
            "district": match.group(1),
        })
    intent = await parse_intent(request)
    if not intent.needs_search:
        return ChatResponse(reply=intent.reply or "궁금하신 음식이나 식당을 말씀해 주세요.")
    district = (intent.district or request.district).strip()[:30]
    query = intent.query.strip()
    if not query and any(token in request.question for token in ("데이트", "기념일", "소개팅", "분위기")):
        query = "레스토랑"
    if not query:
        return ChatResponse(reply="원하시는 음식 종류나 지역을 조금 더 알려주시겠어요?")
    # No fake place data if the external search fails or is not configured.
    places = enrich_verified_links(await search_dining_places(query, district, intent.category, question=request.question, limit=8))
    if not places:
        return ChatResponse(
            reply=f"{district + '에서 ' if district else ''}조건에 맞는 식당을 찾지 못했습니다. 검색어 또는 지역을 바꿔 다시 시도해 주세요.",
            suggested_questions=["다른 종류의 식당 찾아줘", "지역을 넓혀서 검색해줘"],
        )
    reply = await describe_results(request, places)
    if any(token in request.question for token in ("데이트", "기념일", "분위기", "소개팅")):
        reply += "\n\n※ 분위기·가격 등은 장소 검색만으로 검증되지 않으므로 방문 전 상세 정보를 확인해 주세요."
    return ChatResponse(
        reply=reply, show_map=True, places=places,
        suggested_questions=[q for q in intent.suggested_questions if isinstance(q, str)][:3]
        or ["가까운 곳으로 다시 찾아줘", "다른 음식으로 추천해줘"],
    )


@router.get("/payments/providers")
async def payment_providers():
    """Public UI capabilities. No payment is enabled or initiated."""
    from app.services.payment_providers import PROVIDERS
    return {"providers": [provider.model_dump() for provider in PROVIDERS], "checkout_enabled": False}

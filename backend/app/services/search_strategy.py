"""Convert subjective dining requests into verifiable Kakao Local keyword searches.

No review scores, ambiance, prices or availability are invented here. The
search returns candidate venues, not proof that they fit subjective criteria.
"""
from app.schemas.dining import Category, Place
from app.services.kakao import search_places

MOOD_TERMS = ("데이트", "기념일", "소개팅", "분위기", "로맨틱", "특별한 날", "연인")
CUISINE_TERMS = (
    "파스타", "이탈리안", "스테이크", "양식", "한식", "일식", "초밥", "스시",
    "중식", "중국집", "베트남", "태국", "고기", "삼겹살", "바비큐", "라멘",
    "카페", "디저트", "브런치", "베이커리", "피자", "오마카세", "국밥", "분식",
)


def search_candidates(query: str, question: str = "", category: Category = "restaurant") -> list[str]:
    """Produce small, safe keyword retries for vague requests."""
    query = query.strip()
    text = f"{question} {query}".strip()
    matched = next((term for term in CUISINE_TERMS if term in query), None)
    if category == "cafe" or ("카페" in text and "식당" not in text):
        options = [matched or "카페", "카페"]
    elif matched:
        options = [matched, query]
    elif any(term in text for term in MOOD_TERMS):
        # '데이트 좋은 식당' is not a useful location-API keyword.
        options = ["레스토랑", "파스타", "이탈리안"]
    elif any(term in text for term in ("혼밥", "혼자서")):
        options = ["백반", "국밥", "식당"]
    elif query in ("맛집", "식당", "음식점", "추천", "식사"):
        options = ["음식점", "레스토랑"]
    else:
        options = [query]
    return list(dict.fromkeys(s for s in options if s))[:3]


async def search_dining_places(
    query: str, district: str, category: Category = "restaurant",
    question: str = "", lat: float | None = None, lng: float | None = None,
    radius: int = 5000, sort: str = "accuracy", limit: int = 8,
) -> list[Place]:
    """Search in a bounded number of calls; deduplicate by provider IDs."""
    collected: dict[str, Place] = {}
    for keyword in search_candidates(query, question, category):
        results = await search_places(
            keyword, district, category, lat, lng, radius, sort,
            limit=min(15, max(5, limit)),
        )
        for item in results:
            collected.setdefault(item.id, item)
        if len(collected) >= limit:
            break
    return list(collected.values())[:limit]

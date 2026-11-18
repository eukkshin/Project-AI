"""Short-lived Kakao Local API lookups. Do not persist the returned raw place dataset."""
import logging
from urllib.parse import urlparse
import httpx
from fastapi import HTTPException
from pydantic import ValidationError
from app.core.config import settings
from app.schemas.dining import Place, Category

log = logging.getLogger(__name__)
URL = "https://dapi.kakao.com/v2/local/search/keyword.json"
CATEGORY_CODES = {"restaurant": "FD6", "cafe": "CE7"}

def _safe_kakao_url(raw: str) -> str:
    parsed = urlparse(raw)
    if parsed.scheme == "https" and parsed.hostname in ("place.map.kakao.com", "map.kakao.com"):
        return raw
    return ""

async def search_places(
    query: str, district: str = "", category: Category = "all",
    lat: float | None = None, lng: float | None = None,
    radius: int = 5000, sort: str = "accuracy", limit: int = 10,
) -> list[Place]:
    if not settings.kakao_key:
        raise HTTPException(503, "식당 검색을 사용하려면 백엔드 .env에 KAKAO_REST_API_KEY가 필요합니다.")
    params: dict[str, str | int] = {
        "query": " ".join(s for s in (district.strip(), query.strip()) if s)[:110],
        "size": max(1, min(15, limit)), "sort": "accuracy",
    }
    if category in CATEGORY_CODES:
        params["category_group_code"] = CATEGORY_CODES[category]
    if lat is not None and lng is not None:
        params.update({"x": str(lng), "y": str(lat), "radius": max(1, min(20000, radius))})
        if sort == "distance":
            params["sort"] = "distance"
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(9.0), follow_redirects=False) as client:
            resp = await client.get(URL, params=params, headers={"Authorization": f"KakaoAK {settings.kakao_key}"})
            resp.raise_for_status()
            docs = resp.json().get("documents", [])
            if not isinstance(docs, list):
                raise ValueError("Unexpected response")
    except (httpx.HTTPError, ValueError, TypeError) as exc:
        log.warning("Kakao query failure: %s", type(exc).__name__)
        raise HTTPException(502, "카카오 장소 검색에 실패했습니다. API 키·쿼터·네트워크를 확인해 주세요.") from exc

    places: list[Place] = []
    seen: set[str] = set()
    for doc in docs:
        if not isinstance(doc, dict):
            continue
        try:
            if category == "all" and doc.get("category_group_code") not in ("FD6", "CE7"):
                continue
            key = str(doc["id"])
            if key in seen:
                continue
            seen.add(key)
            cat = str(doc.get("category_name", ""))
            address = str(doc.get("road_address_name") or doc.get("address_name") or "")
            if not address:
                continue
            distance = str(doc.get("distance") or "")
            places.append(Place(
                id=key, name=str(doc["place_name"]), category=cat.split(" > ")[-1] if cat else "장소",
                address=address, lat=float(doc["y"]), lng=float(doc["x"]),
                phone=str(doc.get("phone", "")), place_url=_safe_kakao_url(str(doc.get("place_url", ""))),
                distance_m=int(distance) if distance.isdigit() else None,
                description=cat, source="kakao",
            ))
        except (KeyError, ValueError, TypeError, ValidationError):
            log.info("Skipped invalid provider record")
    return places

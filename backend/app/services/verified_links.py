"""Optional, manually vetted reservation links from independently maintained first-party data.

Never infer booking links from the restaurant homepage, Google/Kakao snippets, or LLM output.
This file does not save or scrape Kakao place data. Only records the operator enters
and independently verifies can provide URLs.
"""
import json
import logging
from pathlib import Path
from urllib.parse import urlparse
from app.schemas.dining import Place

log = logging.getLogger(__name__)
MANIFEST = Path(__file__).resolve().parents[1] / "data" / "verified_links.json"

def _safe(url: str) -> str:
    try:
        p = urlparse(url)
        if p.scheme != "https" or not p.hostname or p.username or p.password:
            return ""
        host = p.hostname.lower()
        if host in {"localhost", "127.0.0.1", "0.0.0.0", "::1"} or host.endswith(".local"):
            return ""
        return url
    except (TypeError, ValueError):
        return ""

def enrich_verified_links(places: list[Place]) -> list[Place]:
    if not MANIFEST.is_file():
        return places
    try:
        data = json.loads(MANIFEST.read_text(encoding="utf-8"))
        if not isinstance(data, list):
            return places
    except (OSError, ValueError):
        log.warning("Invalid verified links manifest")
        return places
    by_name_address: dict[tuple[str, str], dict] = {}
    for entry in data:
        if not isinstance(entry, dict) or entry.get("verified") is not True:
            continue
        key = (str(entry.get("name", "")).strip(), str(entry.get("address", "")).strip())
        if all(key):
            by_name_address[key] = entry
    for place in places:
        match = by_name_address.get((place.name, place.address))
        if match:
            place.booking_url = _safe(str(match.get("booking_url", "")))
            place.waitlist_url = _safe(str(match.get("waitlist_url", "")))
    return places

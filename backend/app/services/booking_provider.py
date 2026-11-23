"""Deterministic demo availability; never represents real restaurant inventory."""
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

SEOUL = ZoneInfo('Asia/Seoul')
DEMO_TIMES = ('17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30')


def demo_slots(restaurant: str, visit_date: date, party_size: int) -> list[str]:
    if not 2 <= len(restaurant.strip()) <= 100:
        raise ValueError('식당명을 확인해 주세요.')
    if not 1 <= party_size <= 12:
        raise ValueError('방문 인원은 1~12명이어야 합니다.')
    now = datetime.now(SEOUL)
    if visit_date < now.date() or visit_date > (now + timedelta(days=180)).date():
        raise ValueError('조회 가능한 날짜는 오늘부터 180일 이내입니다.')
    return [t for t in DEMO_TIMES if datetime.fromisoformat(f'{visit_date}T{t}').replace(tzinfo=SEOUL) > now + timedelta(minutes=15)]

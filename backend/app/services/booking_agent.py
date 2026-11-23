"""Draft-only conversational booking extraction. Never checks availability or books a table."""
import re
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo
from pydantic import BaseModel, Field

SEOUL = ZoneInfo('Asia/Seoul')

class Draft(BaseModel):
    restaurant: str = Field(default='', max_length=100)
    date: str = ''
    time: str = ''
    party_size: int = Field(default=0, ge=0, le=12)

class ParseRequest(BaseModel):
    message: str = Field(min_length=1, max_length=1000)
    draft: Draft = Field(default_factory=Draft)

class ParseResult(BaseModel):
    intent: str
    draft: Draft
    missing: list[str]
    question: str
    ready: bool
    demo_only: bool = True


def _date_for(now: datetime, delta: int) -> str:
    return (now + timedelta(days=delta)).strftime('%Y-%m-%d')


def _extract_date(text: str, now: datetime) -> str:
    if '모레' in text: return _date_for(now, 2)
    if '내일' in text: return _date_for(now, 1)
    if '오늘' in text: return _date_for(now, 0)
    dow = re.search(r'(이번\s*주|다음\s*주|이번주|다음주)\s*(월|화|수|목|금|토|일)요일', text)
    if dow:
        target = '월화수목금토일'.index(dow.group(2))
        delta = (target-now.weekday()) % 7
        if '다음' in dow.group(1): delta += 7
        elif delta == 0: delta = 7
        return _date_for(now, delta)
    absolute = re.search(r'(20\d{2})[.\-/년 ]+([01]?\d)[.\-/월 ]+([0-3]?\d)일?', text)
    md = re.search(r'([01]?\d)월\s*([0-3]?\d)일', text)
    try:
        if absolute:
            return datetime(int(absolute.group(1)), int(absolute.group(2)), int(absolute.group(3))).strftime('%Y-%m-%d')
        if md:
            year = now.year
            candidate = datetime(year,int(md.group(1)),int(md.group(2)),tzinfo=SEOUL)
            if candidate.date() < now.date(): year += 1
            return datetime(year,int(md.group(1)),int(md.group(2))).strftime('%Y-%m-%d')
    except ValueError:
        return ''
    return ''


def _extract_time(text: str) -> str:
    hm = re.search(r'(?:(오전|오후|저녁|밤|아침|점심)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?', text)
    if not hm:
        clock = re.search(r'(?<!\d)([01]?\d|2[0-3]):([0-5]\d)(?!\d)', text)
        return f'{int(clock.group(1)):02d}:{clock.group(2)}' if clock else ''
    meridiem, hh, mm = hm.group(1), int(hm.group(2)), int(hm.group(3) or 0)
    if hh > 23 or mm > 59: return ''
    if meridiem in {'오후','저녁','밤'}:
        if hh > 12: return ''
        hh = hh % 12 + 12
    elif meridiem in {'오전','아침'}:
        if hh > 12: return ''
        hh = hh % 12
    elif hh <= 12: return ''  # Bare 7시 is ambiguous.
    return f'{hh:02d}:{mm:02d}'


def _restaurant(text: str) -> str:
    quoted = re.search(r'["“「\']([^"”」\']{2,80})["”」\']',text)
    if quoted: return quoted.group(1).strip()
    # A place explicitly marked as the restaurant; never treat a district as a restaurant.
    m = re.search(r'([가-힣A-Za-z0-9&·\- ]{2,60}?)\s*(?:라는\s*식당|식당에서|레스토랑에서|에서)\s*(?:(?:내일|모레|오늘|이번|다음|오전|오후|저녁|밤|\d{1,2}\s*시|\d+\s*명|예약|자리))', text)
    if not m: return ''
    value = m.group(1).strip().split()[-1]
    if value.endswith(('구','동','시')) or value in {'강남','홍대','성수','잠실','노원','압구정','여의도','이태원','명동','종로','신촌','건대','부산','서울'}: return ''
    return value


def parse_request(request: ParseRequest, now: datetime | None = None) -> ParseResult:
    now = now or datetime.now(SEOUL)
    text = request.message.strip()
    previous = request.draft
    explicit = bool(re.search(r'예약|자리\s*잡아|자리\s*좀|예약해|예약할', text))
    continuation = bool(previous.restaurant or previous.date or previous.time or previous.party_size)
    intent = 'booking' if (explicit or continuation) else 'none'
    if re.search(r'예약\s*(취소|그만)|그만할래|예약\s*안\s*할래', text):
        return ParseResult(intent='cancel',draft=Draft(), missing=[],question='예약 준비를 취소했습니다.',ready=False)
    if intent == 'none':
        return ParseResult(intent='none',draft=previous,missing=[],question='',ready=False)
    people = re.search(r'(\d{1,2})\s*명',text)
    party = int(people.group(1)) if people else 0
    candidate = _restaurant(text)
    if not candidate and not previous.restaurant and re.fullmatch(r'[가-힣A-Za-z0-9&·\- ]{2,60}', text) and not re.search(r'오늘|내일|모레|요일|\d+\s*명|\d+\s*시|오전|오후|저녁|예약|월\s*\d+일', text):
        candidate = text
    updated = Draft(
        restaurant=candidate or previous.restaurant,
        date=_extract_date(text,now) or previous.date,
        time=_extract_time(text) or previous.time,
        party_size=party if 1 <= party <= 12 else previous.party_size,
    )
    missing = [name for name, val in [
        ('restaurant', updated.restaurant), ('date', updated.date),
        ('time', updated.time), ('party_size', updated.party_size)] if not val]
    # Do not accept past dates or past clock times.
    if updated.date and updated.time:
        try:
            visit = datetime.fromisoformat(f'{updated.date}T{updated.time}').replace(tzinfo=SEOUL)
            if visit <= now or visit > now + timedelta(days=180):
                if 'date' not in missing: missing.insert(0,'date')
        except ValueError:
            if 'date' not in missing: missing.insert(0,'date')
    names = {'restaurant':'식당 이름','date':'방문 날짜','time':'방문 시간(오전/오후 포함)','party_size':'방문 인원'}
    question = f'{names[missing[0]]}을 알려주세요.' if missing else '예약 조건이 준비되었습니다. 내용을 확인한 후 모의 예약을 요청할 수 있습니다.'
    return ParseResult(intent='booking',draft=updated,missing=missing,question=question,ready=not missing)

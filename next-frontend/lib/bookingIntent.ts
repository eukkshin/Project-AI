export type BookingDraft = {
  restaurant: string;
  date: string;
  time: string;
  partySize: number;
  source: string;
};

function dateOffset(days: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function validDate(year: number, month: number, day: number): boolean {
  const d = new Date(year, month - 1, day);
  return (
    d.getFullYear() === year &&
    d.getMonth() === month - 1 &&
    d.getDate() === day
  );
}

/** UI-only intent extraction. No reservation is submitted without explicit review.
 * Ambiguous fields remain empty rather than being silently guessed.
 */
export function parseBookingIntent(text: string): BookingDraft | null {
  if (!/(예약|자리\s*잡아|자리\s*좀\s*잡아)/.test(text)) return null;
  const now = new Date();
  let date = "";
  if (/모레/.test(text)) date = dateOffset(2);
  else if (/내일/.test(text)) date = dateOffset(1);
  else if (/오늘/.test(text)) date = dateOffset(0);
  else {
    const weekday = text.match(
      /(이번\s*주|다음\s*주|이번주|다음주)\s*(월|화|수|목|금|토|일)요일/,
    );
    if (weekday) {
      const target = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }[
        weekday[2] as "일" | "월" | "화" | "수" | "목" | "금" | "토"
      ];
      let offset = (target - now.getDay() + 7) % 7;
      if (weekday[1].includes("다음")) offset += 7;
      else if (offset === 0) offset = 7;
      date = dateOffset(offset);
    } else {
      const iso = text.match(
        /(20\d{2})[.\-/년 ]+([01]?\d)[.\-/월 ]+([0-3]?\d)일?/,
      );
      const md = text.match(/([01]?\d)월\s*([0-3]?\d)일/);
      if (iso) {
        const y = Number(iso[1]),
          m = Number(iso[2]),
          d = Number(iso[3]);
        if (validDate(y, m, d))
          date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      } else if (md) {
        let y = now.getFullYear();
        const m = Number(md[1]),
          d = Number(md[2]);
        if (validDate(y, m, d)) {
          if (new Date(y, m - 1, d, 23, 59) < now) y++;
          if (validDate(y, m, d))
            date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
        }
      }
    }
  }
  const hm = text.match(
    /(?:(오전|오후|저녁|밤|아침|점심)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분)?/,
  );
  let time = "";
  if (hm) {
    let hour = Number(hm[2]);
    const minute = Number(hm[3] || 0);
    if (["오후", "저녁", "밤"].includes(hm[1] || "") && hour < 12) hour += 12;
    if (["오전", "아침"].includes(hm[1] || "") && hour === 12) hour = 0;
    // A bare '7시' is ambiguous; ask the user to select a time.
    if ((hm[1] || hour > 12) && hour < 24 && minute < 60) {
      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
  }
  const people = text.match(/(\d{1,2})\s*명/);
  const quoted = text.match(/["“「']([^"”」']{2,60})["”」']/);
  // Restaurant name is best-effort, never a verified merchant/availability.
  const at = text.match(
    /(?:^|\s)([^\s,，.]{2,35}?)(?:에서|에)\s*(?:(?:내일|모레|오늘|\d+월)|(?:오전|오후|저녁|밤|\d+시)|(?:\d+명)|예약)/,
  );
  const candidate = (quoted?.[1] || at?.[1] || "").trim();
  const restaurant = [
    "강남",
    "홍대",
    "성수",
    "잠실",
    "노원",
    "압구정",
    "여의도",
    "이태원",
    "명동",
    "종로",
    "신촌",
    "건대",
    "부산",
    "서울",
  ].includes(candidate)
    ? ""
    : candidate;
  return {
    restaurant,
    date,
    time,
    partySize: people ? Number(people[1]) : 0,
    source: text,
  };
}

/** Local-only fallback for a booking draft conversation; never claims actual AI inference. */
export function continueBookingDraft(
  previous: BookingDraft,
  message: string,
): BookingDraft {
  const raw = message.trim();
  const parsed = parseBookingIntent(`예약 ${raw}`);
  if (!parsed) return previous;
  const standaloneName =
    /^[가-힣A-Za-z0-9&·\- ]{2,60}$/.test(raw) &&
    !/(오늘|내일|모레|요일|\d+\s*명|\d+\s*시|오전|오후|저녁|예약|월\s*\d+일)/.test(
      raw,
    )
      ? raw
      : "";
  return {
    restaurant: parsed.restaurant || standaloneName || previous.restaurant,
    date: parsed.date || previous.date,
    time: parsed.time || previous.time,
    partySize: parsed.partySize || previous.partySize,
    source: previous.source,
  };
}

export function bookingMissing(draft: BookingDraft): string[] {
  const missing = [];
  if (!draft.restaurant.trim()) missing.push("식당 이름");
  if (!draft.date) missing.push("방문 날짜");
  if (!draft.time) missing.push("방문 시간(오전/오후 포함)");
  if (!draft.partySize) missing.push("방문 인원");
  return missing;
}

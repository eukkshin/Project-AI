export type BookingDraft = {
  restaurant: string;
  date: string;
  time: string;
  partySize: number;
  source: string;
};

function localDate(offsetDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
/** Limited demo recognizer. The user must review and explicitly submit before API calls. */
export function parseBookingIntent(text: string): BookingDraft | null {
  if (!/(예약|자리.*잡아|자리.*잡아줘)/.test(text)) return null;
  const now = new Date();
  let date = "";
  if (/모레/.test(text)) date = localDate(2);
  else if (/내일/.test(text)) date = localDate(1);
  else if (/오늘/.test(text)) date = localDate(0);
  else {
    const weekday = text.match(
      /(이번\s*주|다음\s*주|이번주|다음주)\s*(월|화|수|목|금|토|일)요일/,
    );
    if (weekday) {
      const target = { 일: 0, 월: 1, 화: 2, 수: 3, 목: 4, 금: 5, 토: 6 }[
        weekday[2] as "일" | "월" | "화" | "수" | "목" | "금" | "토"
      ];
      const current = now.getDay();
      let offset = (target - current + 7) % 7;
      if (weekday[1].includes("다음")) offset += offset === 0 ? 7 : 7;
      if (!weekday[1].includes("다음") && offset === 0) offset = 7;
      date = localDate(offset);
    }
    const iso = text.match(
      /(20\d{2})[.\-/년 ]+([01]?\d)[.\-/월 ]+([0-3]?\d)일?/,
    );
    const md = text.match(/([01]?\d)월\s*([0-3]?\d)일/);
    if (!date && iso)
      date = `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
    else if (!date && md) {
      let year = now.getFullYear();
      const month = Number(md[1]);
      const day = Number(md[2]);
      if (new Date(year, month - 1, day, 23, 59) < now) year++;
      date = `${year}-${md[1].padStart(2, "0")}-${md[2].padStart(2, "0")}`;
    }
  }
  const hm = text.match(
    /(?:(오전|오후|저녁|밤|아침|점심)\s*)?(\d{1,2})\s*시(?:\s*(\d{1,2})\s*분?)?/,
  );
  let time = "";
  if (hm) {
    let hour = Number(hm[2]);
    const minute = Number(hm[3] || 0);
    if (["오후", "저녁", "밤"].includes(hm[1] || "") && hour < 12) hour += 12;
    if ((hm[1] === "오전" || hm[1] === "아침") && hour === 12) hour = 0;
    if (hour < 24 && minute < 60)
      time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
  const people = text.match(/(\d{1,2})\s*명/);
  const quoted = text.match(/["“「']([^"”」']{2,60})["”」']/);
  const at = text.match(
    /(?:^|\s)([^\s,，.]{2,35}?)(?:에서|에)\s*(?:(?:내일|모레|오늘|\d+월)|(?:오전|오후|저녁|밤|\d+시)|(?:\d+명)|예약)/,
  );
  const restaurant = (quoted?.[1] || at?.[1] || "").trim();
  return {
    restaurant,
    date,
    time,
    partySize: people ? Number(people[1]) : 2,
    source: text,
  };
}

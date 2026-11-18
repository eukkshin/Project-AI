"use client";
import { BookHeart, Plus, Star, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { createId } from "@/lib/createId";

interface Entry {
  id: string;
  place: string;
  date: string;
  rating: number;
  note: string;
}
const KEY = "dinovo-journal-v1";
export default function JournalView() {
  const [items, setItems] = useState<Entry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [place, setPlace] = useState("");
  const [date, setDate] = useState("");
  const [rating, setRating] = useState(4);
  const [note, setNote] = useState("");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(v))
        setItems(
          v
            .filter(
              (x) =>
                x && typeof x.place === "string" && typeof x.id === "string",
            )
            .slice(0, 100),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(items.slice(0, 100)));
    } catch {}
  }, [items, loaded]);
  function add(e: React.FormEvent) {
    e.preventDefault();
    if (!place.trim()) return;
    setItems((prev) => [
      {
        id: createId(),
        place: place.trim().slice(0, 100),
        date: date || new Date().toISOString().slice(0, 10),
        rating,
        note: note.trim().slice(0, 1000),
      },
      ...prev,
    ]);
    setEditing(false);
    setPlace("");
    setDate("");
    setNote("");
    setRating(4);
  }
  return (
    <main className="content-view journal-view">
      <span className="eyebrow">MY DINING JOURNAL</span>
      <div className="page-title-row">
        <div>
          <h1>미식 다이어리</h1>
          <p>방문한 곳에서의 기억을 기록하고 나만의 취향을 쌓아보세요.</p>
        </div>
        <button className="solid-button" onClick={() => setEditing((x) => !x)}>
          <Plus size={17} /> 기록 추가
        </button>
      </div>
      {editing && (
        <form className="journal-form" onSubmit={add}>
          <div className="journal-form-row">
            <label>
              식당명
              <input
                value={place}
                maxLength={100}
                onChange={(e) => setPlace(e.target.value)}
                required
                placeholder="직접 입력해 주세요"
              />
            </label>
            <label>
              방문 날짜
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              내 평점
              <select
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} / 5
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label>
            나의 메모
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="무엇을 먹었고 어떤 점이 좋았나요?"
            />
          </label>
          <div className="form-actions">
            <button className="solid-button" type="submit">
              기록 저장
            </button>
            <button
              className="outline-button"
              type="button"
              onClick={() => setEditing(false)}
            >
              취소
            </button>
          </div>
        </form>
      )}
      {items.length ? (
        <div className="journal-list">
          {items.map((item) => (
            <article key={item.id} className="journal-item">
              <div>
                <span className="eyebrow">{item.date}</span>
                <h3>{item.place}</h3>
                <div
                  className="journal-stars"
                  aria-label={`내 평점 ${item.rating}점`}
                >
                  {Array.from({ length: item.rating }).map((_, i) => (
                    <Star key={i} size={14} fill="currentColor" />
                  ))}
                </div>
                <p>{item.note || "메모 없음"}</p>
              </div>
              <button
                aria-label="기록 삭제"
                title="기록 삭제"
                onClick={() => {
                  if (confirm("이 기록을 삭제할까요?"))
                    setItems((prev) => prev.filter((v) => v.id !== item.id));
                }}
              >
                <Trash2 size={18} />
              </button>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-results big">
          <BookHeart size={30} />
          <strong>아직 기록이 없어요.</strong>
          <p>직접 방문한 식당과 기억을 첫 번째로 기록해 보세요.</p>
        </div>
      )}
      <p className="privacy-note">
        미식 기록은 현재 브라우저에만 저장됩니다. 기기를 변경하거나 브라우저
        데이터를 삭제하면 사라질 수 있습니다.
      </p>
    </main>
  );
}

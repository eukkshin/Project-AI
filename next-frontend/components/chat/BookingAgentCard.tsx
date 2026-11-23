"use client";
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";

import { api, token } from "@/lib/accountApi";

import type { BookingDraft } from "@/lib/bookingIntent";

export default function BookingAgentCard({
  draft,
  onLogin,
  onManage,
}: {
  draft: BookingDraft;
  onLogin: () => void;
  onManage: () => void;
}) {
  const [restaurant, setRestaurant] = useState(draft.restaurant);
  const [date, setDate] = useState(draft.date);
  const [time, setTime] = useState(draft.time);
  const [party, setParty] = useState(draft.partySize);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRestaurant(draft.restaurant);
    setDate(draft.date);
    setTime(draft.time);
    setParty(draft.partySize);
    setDone(false);
    setError("");
  }, [draft]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!token()) {
      onLogin();
      return;
    }
    const local = new Date(`${date}T${time}:00`);
    if (!Number.isFinite(local.getTime()) || local.getTime() <= Date.now()) {
      setError("미래의 방문 일시를 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      await api("/api/bookings/demo", {
        method: "POST",
        body: JSON.stringify({
          restaurant: restaurant.trim(),
          party_size: party,
          visit_at: local.toISOString(),
        }),
      });
      setDone(true);
      window.dispatchEvent(new Event("dinovo:bookings-changed"));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "예약 시뮬레이션을 시작할 수 없습니다.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="d-agent-card" aria-label="AI 모의 예약 진행">
      <div className="d-agent-heading">
        <span>
          <CalendarClock size={19} /> AI 예약 에이전트
        </span>
        <small>시뮬레이션 · 실예약 아님</small>
      </div>
      {done ? (
        <div className="d-agent-done">
          <CheckCircle2 size={24} />
          <strong>모의 예약 요청이 생성되었습니다.</strong>
          <p>
            승인 대기 상태로 저장했습니다. 등록된 기기에 푸시 알림 전송을
            시도하며, 수신은 보장되지 않습니다. 실제 식당에는 예약되지 않습니다.
          </p>
          <button type="button" onClick={onManage}>
            내 예약에서 승인하기
          </button>
        </div>
      ) : (
        <>
          <p className="d-agent-info">
            요청하신 내용을 확인해 주세요. 비어 있는 정보는 직접 입력할 수
            있습니다. 이 단계에서는 예약·결제가 발생하지 않습니다.
          </p>
          <form onSubmit={(e) => void submit(e)} className="d-agent-fields">
            <label>
              식당명
              <input
                required
                minLength={2}
                maxLength={100}
                value={restaurant}
                placeholder="예: 우래옥"
                onChange={(e) => setRestaurant(e.target.value)}
              />
            </label>
            <label>
              방문 날짜
              <input
                type="date"
                required
                value={date}
                min={
                  new Date().getFullYear() +
                  "-" +
                  String(new Date().getMonth() + 1).padStart(2, "0") +
                  "-" +
                  String(new Date().getDate()).padStart(2, "0")
                }
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label>
              방문 시간
              <input
                type="time"
                required
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </label>
            <label>
              인원
              <input
                type="number"
                min={1}
                max={12}
                required
                value={party}
                onChange={(e) => setParty(Number(e.target.value))}
              />
            </label>
            {error && (
              <p role="alert" className="d-agent-error">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="d-agent-submit"
              disabled={busy || !restaurant.trim() || !date || !time}
            >
              {busy ? <LoaderCircle size={16} /> : <ShieldCheck size={16} />}{" "}
              {busy ? "요청 생성 중..." : "확인하고 모의 예약 요청"}
            </button>
          </form>
          <p className="d-agent-push">
            <Bell size={14} /> 푸시 수신은 내 예약에서 기기별 알림을 등록하고
            HTTPS로 접속해야 합니다.
          </p>
        </>
      )}
    </section>
  );
}

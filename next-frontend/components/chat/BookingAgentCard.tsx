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
import {
  BookingDraft,
  bookingMissing,
  continueBookingDraft,
} from "@/lib/bookingIntent";
import {
  createOfflineBooking,
  offlineDemoEnabled,
  setOfflineDemoEnabled,
} from "@/lib/offlineDemo";

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
  const [party, setParty] = useState<number | "">(draft.partySize || "");
  const [busy, setBusy] = useState(false);
  const [slots, setSlots] = useState<string[]>([]);
  const [slotsChecked, setSlotsChecked] = useState(false);
  const [slotsBusy, setSlotsBusy] = useState(false);
  const [followup, setFollowup] = useState("");
  const [parsing, setParsing] = useState(false);
  const [question, setQuestion] = useState("");
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setOffline(offlineDemoEnabled());
    const sync = () => setOffline(offlineDemoEnabled());
    window.addEventListener("dinovo:offline-demo-changed", sync);
    return () =>
      window.removeEventListener("dinovo:offline-demo-changed", sync);
  }, []);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setRestaurant(draft.restaurant);
    setDate(draft.date);
    setTime(draft.time);
    setParty(draft.partySize || "");
    setDone(false);
    setError("");
    setQuestion("");
    setSlots([]);
    setSlotsChecked(false);
  }, [draft]);
  const current: BookingDraft = {
    ...draft,
    restaurant,
    date,
    time,
    partySize: party === "" ? 0 : party,
  };
  const missing = bookingMissing(current);
  async function applyFollowup(e: React.FormEvent) {
    e.preventDefault();
    if (!followup.trim()) return;
    setParsing(true);
    setError("");
    try {
      let updated = continueBookingDraft(current, followup);
      let nextQuestion = "";
      if (!offline) {
        const result = await api<{
          draft: {
            restaurant: string;
            date: string;
            time: string;
            party_size: number;
          };
          question: string;
        }>("/api/booking-agent/turn", {
          method: "POST",
          body: JSON.stringify({
            message: followup,
            draft: { restaurant, date, time, party_size: party || 0 },
          }),
        });
        updated = {
          ...current,
          restaurant: result.draft.restaurant,
          date: result.draft.date,
          time: result.draft.time,
          partySize: result.draft.party_size,
        };
        nextQuestion = result.question;
      }
      setRestaurant(updated.restaurant);
      setDate(updated.date);
      setTime(updated.time);
      clearSlots();
      setParty(updated.partySize || "");
      setQuestion(nextQuestion);
      setFollowup("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "조건을 분석하지 못했습니다. 입력란에서 직접 수정할 수 있습니다.",
      );
    } finally {
      setParsing(false);
    }
  }
  async function loadSlots() {
    setError("");
    setSlotsBusy(true);
    setSlots([]);
    setSlotsChecked(false);
    try {
      if (
        !restaurant.trim() ||
        !date ||
        party === "" ||
        party < 1 ||
        party > 12
      )
        throw new Error("식당·날짜·인원을 먼저 입력해 주세요.");
      const response = await api<{
        slots: string[];
        demo_only: boolean;
        real_inventory: boolean;
        message: string;
      }>("/api/booking-agent/availability", {
        method: "POST",
        body: JSON.stringify({
          restaurant: restaurant.trim(),
          date,
          party_size: party,
        }),
      });
      if (!response.demo_only || response.real_inventory)
        throw new Error("예약 제공자 응답을 확인하지 못했습니다.");
      setSlots(response.slots);
      setSlotsChecked(true);
      if (time && !response.slots.includes(time)) setTime("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "가상 시간 조회에 실패했습니다.",
      );
    } finally {
      setSlotsBusy(false);
    }
  }
  function clearSlots() {
    setSlots([]);
    setSlotsChecked(false);
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!offline && !token()) {
      setError(
        "먼저 로그인해 주세요. 로그인 후 예약 내용을 그대로 확인할 수 있습니다.",
      );
      onLogin();
      return;
    }
    if (
      !restaurant.trim() ||
      party === "" ||
      !Number.isInteger(party) ||
      party < 1 ||
      party > 12
    ) {
      setError("식당명과 인원을 확인해 주세요.");
      return;
    }
    if (!offline && (!slotsChecked || !slots.includes(time))) {
      setError("가상 예약 시간 조회 후 목록에서 시간을 선택해 주세요.");
      return;
    }
    const local = new Date(`${date}T${time}:00`);
    if (!Number.isFinite(local.getTime()) || local.getTime() <= Date.now()) {
      setError("미래의 방문 일시를 선택해 주세요.");
      return;
    }
    setBusy(true);
    try {
      if (offline) createOfflineBooking(restaurant, local.toISOString(), party);
      else
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
      <label className="d-offline-toggle">
        <input
          type="checkbox"
          checked={offline}
          onChange={(e) => setOfflineDemoEnabled(e.target.checked)}
        />{" "}
        Render 없이 브라우저에서만 모의 예약하기
      </label>
      {offline && (
        <p className="d-offline-note">
          로컬 시연 모드: 이 브라우저에만 저장됩니다. 실제 API·푸시 알림·식당
          예약·결제는 실행되지 않습니다.
        </p>
      )}
      {done ? (
        <div className="d-agent-done">
          <CheckCircle2 size={24} />
          <strong>모의 예약 요청이 생성되었습니다.</strong>
          <p>
            {offline
              ? "이 브라우저에만 승인 대기 상태를 저장했습니다. 실제 푸시·예약·결제는 발생하지 않습니다."
              : "서버에 승인 대기 상태로 저장했습니다. 등록된 기기에 푸시 알림 전송을 시도하며, 수신은 보장되지 않습니다. 실제 식당에는 예약되지 않습니다."}
          </p>
          <button type="button" onClick={onManage}>
            내 예약에서 승인하기
          </button>
        </div>
      ) : (
        <>
          <p className="d-agent-info">
            요청하신 내용을 확인해 주세요. 비어 있는 정보는 직접 입력하거나
            아래에서 대화로 보완할 수 있습니다. 실제 예약·결제는 서버에서
            차단됩니다.
          </p>
          <div className="d-agent-conversation" aria-live="polite">
            <strong>
              {missing.length
                ? `${missing[0]}을(를) 알려주세요.`
                : "예약 조건을 확인해 주세요."}
            </strong>
            {question && <p>{question}</p>}
            <form
              onSubmit={(e) => void applyFollowup(e)}
              className="d-agent-followup-form"
            >
              <input
                aria-label="예약 조건 추가로 말하기"
                value={followup}
                onChange={(e) => setFollowup(e.target.value)}
                placeholder="예: 우래옥 / 내일 오후 7시 / 2명"
                maxLength={1000}
              />
              <button type="submit" disabled={!followup.trim() || parsing}>
                {parsing ? "분석 중" : "조건 반영"}
              </button>
            </form>
            <small>
              {offline
                ? "로컬 규칙 기반 분석 · 서버 호출 없음"
                : "Python 예약 조건 분석 API · 실예약 없음"}
            </small>
          </div>
          <form onSubmit={(e) => void submit(e)} className="d-agent-fields">
            <label>
              식당명
              <input
                required
                minLength={2}
                maxLength={100}
                value={restaurant}
                placeholder="예: 우래옥"
                onChange={(e) => {
                  setRestaurant(e.target.value);
                  clearSlots();
                }}
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
                onChange={(e) => {
                  setDate(e.target.value);
                  clearSlots();
                }}
              />
            </label>
            {!offline && (
              <div className="d-demo-slots">
                <button
                  type="button"
                  disabled={
                    slotsBusy || !restaurant.trim() || !date || party === ""
                  }
                  onClick={() => void loadSlots()}
                >
                  {slotsBusy ? "가상 시간 확인 중..." : "가상 예약 시간 조회"}
                </button>
                {slotsChecked && (
                  <>
                    <p className="account-note">
                      테스트용 시간표입니다. 실제 식당의 예약 가능 여부가
                      아닙니다.
                    </p>
                    <div
                      className="booking-buttons"
                      role="group"
                      aria-label="가상 예약 시간 선택"
                    >
                      {slots.length ? (
                        slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            aria-pressed={time === slot}
                            onClick={() => setTime(slot)}
                          >
                            {slot}
                          </button>
                        ))
                      ) : (
                        <span>선택할 수 있는 가상 시간이 없습니다.</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            )}
            <label>
              방문 시간
              <input
                type="time"
                required
                readOnly={!offline}
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
                onChange={(e) => {
                  setParty(e.target.value === "" ? "" : Number(e.target.value));
                  clearSlots();
                }}
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
              disabled={
                busy ||
                !restaurant.trim() ||
                !date ||
                !time ||
                party === "" ||
                (!offline && !slots.includes(time))
              }
            >
              {busy ? <LoaderCircle size={16} /> : <ShieldCheck size={16} />}{" "}
              {busy ? "요청 생성 중..." : "확인하고 모의 예약 요청"}
            </button>
          </form>
          {!offline && (
            <p className="d-agent-push">
              <Bell size={14} /> 푸시 수신은 내 예약에서 기기별 알림을 등록하고
              HTTPS로 접속해야 합니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}

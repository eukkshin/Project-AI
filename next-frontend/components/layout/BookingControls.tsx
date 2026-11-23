"use client";

import { Bell, CalendarClock, CheckCircle2, Clock3, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { api, Booking, token } from "@/lib/accountApi";

import type { View } from "@/components/layout/Topbar";

const ACTIVE = new Set([
  "approval_pending",
  "searching",
  "executing",
  "requested",
  "approved",
]);
const PENDING = "approval_pending";
const statusText: Record<string, string> = {
  approval_pending: "승인 대기",
  searching: "검색 중",
  executing: "예약 처리 중",
  requested: "예약 접수",
  approved: "승인 완료",
  demo_approved: "모의 승인 완료",
  rejected: "거절됨",
  expired: "승인 만료",
  confirmed: "예약 확정",
  failed: "예약 실패",
};

type Props = { onNavigate: (view: View) => void; onSettings: () => void };

export default function BookingControls({ onNavigate }: Props) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [signedIn, setSignedIn] = useState(false);
  const [panel, setPanel] = useState<"notifications" | null>(null);
  const [error, setError] = useState("");
  const holder = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const hasToken = Boolean(token());
    setSignedIn(hasToken);
    if (!hasToken) {
      setBookings([]);
      setError("");
      return;
    }
    try {
      const result = await api<{ items: Booking[] }>("/api/bookings/demo");
      setBookings(result.items);
      setError("");
    } catch {
      setBookings([]);
      setError("예약 상태를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, 20000);
    const onFocus = () => {
      if (!document.hidden) void refresh();
    };
    const onDataChange = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("dinovo:auth-changed", onDataChange);
    window.addEventListener("dinovo:bookings-changed", onDataChange);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("dinovo:auth-changed", onDataChange);
      window.removeEventListener("dinovo:bookings-changed", onDataChange);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  useEffect(() => {
    if (!panel) return;
    function closeOutside(event: MouseEvent) {
      if (!holder.current?.contains(event.target as Node)) setPanel(null);
    }
    function closeEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setPanel(null);
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, [panel]);

  const active = bookings.filter((b) => ACTIVE.has(b.status));
  const pending = active.filter((b) => b.status === PENDING);
  const status = pending.length
    ? `${pending.length}건 승인 대기`
    : active.length
      ? `${active.length}건 예약 진행 중`
      : "";
  const openBookings = () => {
    setPanel(null);
    onNavigate(signedIn ? "bookings" : "account");
  };
  const openPage = (view: View) => {
    setPanel(null);
    onNavigate(view);
  };

  return (
    <div className="booking-top-controls" ref={holder}>
      {status && (
        <button
          type="button"
          className={`booking-progress-pill ${pending.length ? "needs-approval" : ""}`}
          onClick={openBookings}
        >
          <CalendarClock size={15} aria-hidden="true" />
          <span>{status}</span>
        </button>
      )}
      <button
        type="button"
        className="icon-button booking-notify-trigger"
        aria-label="예약 알림 센터"
        aria-expanded={panel === "notifications"}
        onClick={() =>
          setPanel(panel === "notifications" ? null : "notifications")
        }
      >
        <Bell size={19} />
        {pending.length > 0 && (
          <span className="booking-notify-count">
            {pending.length > 9 ? "9+" : pending.length}
          </span>
        )}
      </button>
      {panel === "notifications" && (
        <div
          className="booking-popover"
          role="dialog"
          aria-label="예약 알림 센터"
        >
          <div className="booking-popover-head">
            <strong>예약 알림</strong>
            <button
              className="booking-popover-close"
              type="button"
              aria-label="알림 닫기"
              onClick={() => setPanel(null)}
            >
              <X size={17} />
            </button>
          </div>
          {!signedIn ? (
            <div className="booking-popover-empty">
              <Bell size={22} />
              <p>로그인하면 예약 승인 요청과 처리 결과를 확인할 수 있습니다.</p>
              <button type="button" onClick={() => openPage("account")}>
                로그인 / 회원가입
              </button>
            </div>
          ) : error ? (
            <div className="booking-popover-empty">
              <p role="alert">{error}</p>
              <button type="button" onClick={() => void refresh()}>
                다시 시도
              </button>
            </div>
          ) : bookings.length === 0 ? (
            <div className="booking-popover-empty">
              <Bell size={22} />
              <p>아직 예약 알림이 없습니다.</p>
              <span>예약 요청이 생기면 여기에 표시됩니다.</span>
            </div>
          ) : (
            <div className="booking-popover-list">
              {bookings.slice(0, 7).map((booking) => (
                <button
                  type="button"
                  key={booking.id}
                  className="booking-popover-entry"
                  onClick={openBookings}
                >
                  <span
                    className={`booking-entry-symbol ${booking.status === PENDING ? "waiting" : ""}`}
                  >
                    {booking.status === PENDING ? (
                      <Clock3 size={17} />
                    ) : (
                      <CheckCircle2 size={17} />
                    )}
                  </span>
                  <span className="booking-entry-content">
                    <strong>{booking.restaurant}</strong>
                    <span>
                      {statusText[booking.status] ?? booking.status} ·{" "}
                      {booking.party_size}명
                    </span>
                  </span>
                  {booking.status === PENDING && (
                    <span className="booking-entry-open">확인</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            className="booking-popover-footer"
            onClick={openBookings}
          >
            내 예약 전체 보기
          </button>
          <p className="booking-popover-disclaimer">
            현재 예약은 시뮬레이션이며 실제 식당 예약은 발생하지 않습니다.
          </p>
        </div>
      )}
    </div>
  );
}

"use client";
import { useEffect, useState } from "react";

import { api, Booking, token } from "@/lib/accountApi";
import {
  clearOfflineBookings,
  createOfflineBooking,
  decideOfflineBooking,
  listOfflineBookings,
  offlineDemoEnabled,
  setOfflineDemoEnabled,
} from "@/lib/offlineDemo";

type ApiList = { items: Booking[] };
const pretty = (s: string) =>
  (
    ({
      approval_pending: "승인 대기",
      demo_approved: "모의 승인 완료 · 실행 대기",
      demo_confirmed: "가상 예약 실행 완료",
      rejected: "거절",
      expired: "승인 만료",
    }) as Record<string, string>
  )[s] || s;
export default function BookingsView({ goAccount }: { goAccount: () => void }) {
  const [items, setItems] = useState<Booking[]>([]);
  const [restaurant, setRestaurant] = useState("DINOVO 시연 레스토랑");
  const [visit, setVisit] = useState("");
  const [party, setParty] = useState(2);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmationCodes, setConfirmationCodes] = useState<
    Record<string, string>
  >({});
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(false);
  const [offline, setOffline] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "pending" | "completed">(
    "all",
  );
  const filteredItems = items.filter(
    (item) =>
      listFilter === "all" ||
      (listFilter === "pending"
        ? item.status === "approval_pending"
        : item.status !== "approval_pending"),
  );
  async function refresh() {
    try {
      if (offlineDemoEnabled()) {
        setItems(listOfflineBookings());
        return;
      }
      const data = await api<ApiList>("/api/bookings/demo");
      setItems(data.items);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "예약 정보를 불러오지 못했습니다.",
      );
    }
  }
  useEffect(() => {
    const synchronize = () => {
      const local = offlineDemoEnabled();
      setOffline(local);
      const isSignedIn = local || Boolean(token());
      setSigned(isSignedIn);
      if (isSignedIn) {
        void refresh();
      } else {
        setItems([]);
        setError("");
      }
    };
    synchronize();
    window.addEventListener("dinovo:auth-changed", synchronize);
    window.addEventListener("dinovo:bookings-changed", synchronize);
    window.addEventListener("dinovo:offline-demo-changed", synchronize);
    return () => {
      window.removeEventListener("dinovo:auth-changed", synchronize);
      window.removeEventListener("dinovo:bookings-changed", synchronize);
      window.removeEventListener("dinovo:offline-demo-changed", synchronize);
    };
  }, []);
  async function enablePush() {
    if (offline) {
      setError("로컬 시연 모드에서는 실제 푸시 알림을 보낼 수 없습니다.");
      return;
    }
    setError("");
    setNotice("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window))
        throw new Error("이 브라우저에서는 푸시 알림이 지원되지 않습니다.");
      if (!window.isSecureContext)
        throw new Error(
          "푸시 알림은 HTTPS 또는 localhost에서만 등록할 수 있습니다.",
        );
      const cap = await api<{ public_vapid_key: string }>(
        "/api/bookings/capabilities",
      );
      if (!cap.public_vapid_key)
        throw new Error("서버에 VAPID 공개키가 설정되지 않았습니다.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted")
        throw new Error("알림 권한을 허용해야 합니다.");
      const worker = await navigator.serviceWorker.register(
        "/group/three/3/sw.js",
        { scope: "/group/three/3/" },
      );
      const existing = await worker.pushManager.getSubscription();
      const decode = (value: string) => {
        const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
        const raw = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
        return Uint8Array.from(raw, (c) => c.charCodeAt(0));
      };
      const subscription =
        existing ??
        (await worker.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decode(cap.public_vapid_key),
        }));
      await api("/api/push/subscribe", {
        method: "POST",
        body: JSON.stringify(subscription.toJSON()),
      });
      setNotice(
        "이 기기의 푸시 구독을 등록했습니다. 실제 알림 도착 여부는 기기 설정에 따라 달라집니다.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "푸시 등록 실패");
    }
  }
  async function testPush() {
    if (offline) {
      setError("로컬 시연 모드에서는 실제 푸시 알림을 보낼 수 없습니다.");
      return;
    }
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const result = await api<{
        sent_attempted: boolean;
        delivery_guaranteed: boolean;
      }>("/api/push/test", { method: "POST" });
      setNotice(
        result.sent_attempted
          ? "서버에서 테스트 알림 발송을 시도했습니다. 실제 기기에 도착하는지 확인해 주세요."
          : "서버에서 푸시 발송을 시도하지 않았습니다. 알림 구독과 VAPID 설정을 확인해 주세요.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "푸시 테스트 실패");
    } finally {
      setBusy(false);
    }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (offline)
        createOfflineBooking(restaurant, new Date(visit).toISOString(), party);
      else
        await api("/api/bookings/demo", {
          method: "POST",
          body: JSON.stringify({
            restaurant,
            party_size: party,
            visit_at: new Date(visit).toISOString(),
          }),
        });
      await refresh();
      window.dispatchEvent(new Event("dinovo:bookings-changed"));
      setNotice(
        "모의 예약 승인 요청을 생성했습니다. 실제 식당에 예약되지 않았습니다.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "예약 요청 실패");
    } finally {
      setBusy(false);
    }
  }
  async function decide(id: string, decision: "approve" | "reject") {
    setBusy(true);
    setError("");
    try {
      if (offline) decideOfflineBooking(id, decision);
      else
        await api(
          `/api/bookings/demo/${id}/decision?decision=${decision}&auto_execute=${decision === "approve"}`,
          { method: "POST" },
        );
      await refresh();
      window.dispatchEvent(new Event("dinovo:bookings-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 실패");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  async function executeDemo(id: string) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await api<{
        booking_id: string;
        status: string;
        confirmation_code: string;
        demo_only: boolean;
        real_booking_created: boolean;
      }>(`/api/booking-agent/demo/${encodeURIComponent(id)}/execute`, {
        method: "POST",
      });
      if (!result.demo_only || result.real_booking_created)
        throw new Error("모의 실행 응답이 올바르지 않습니다.");
      setConfirmationCodes((prev) => ({
        ...prev,
        [id]: result.confirmation_code,
      }));
      setNotice(
        `가상 예약 실행이 완료됐습니다. 테스트 번호: ${result.confirmation_code} (실예약 아님)`,
      );
      await refresh();
      window.dispatchEvent(new Event("dinovo:bookings-changed"));
    } catch (e) {
      setError(e instanceof Error ? e.message : "모의 실행 실패");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-view">
      <header>
        <p className="account-eyebrow">DINOVO BOOKING AGENT</p>
        <h1>AI 예약 · 승인</h1>
        <p>
          예약 Agent 승인·모의 실행을 테스트합니다. 실제 예약 및 결제는 발생하지
          않습니다.
        </p>
      </header>
      <div className="account-panel d-offline-panel">
        <label className="d-offline-toggle">
          <input
            type="checkbox"
            checked={offline}
            onChange={(e) => setOfflineDemoEnabled(e.target.checked)}
          />{" "}
          로컬 시연 모드 (Render 연결 없이 테스트)
        </label>
        <p className="account-note">
          이 모드의 예약은 현재 브라우저에만 저장됩니다. 실제 예약·결제·푸시
          알림은 실행되지 않으며, 서버 예약과 별개입니다.
        </p>
        {offline && (
          <button
            type="button"
            onClick={() => {
              if (
                window.confirm(
                  "이 브라우저에 저장된 시연 예약을 모두 삭제할까요?",
                )
              ) {
                clearOfflineBookings();
                setNotice("로컬 시연 데이터를 삭제했습니다.");
              }
            }}
          >
            로컬 시연 데이터 삭제
          </button>
        )}
      </div>
      {!signed ? (
        <div className="account-panel">
          <p>예약 작업은 로그인 계정별로 관리합니다.</p>
          <button onClick={goAccount}>로그인하러 가기</button>
        </div>
      ) : (
        <>
          {!offline && (
            <div className="account-panel">
              <h2>알림 설정</h2>
              <p className="account-note">
                HTTPS 환경에서 기기별 Web Push를 활성화할 수 있습니다. iPhone은
                홈 화면에 설치한 PWA에서 사용하세요.
              </p>
              <div className="booking-buttons">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void enablePush()}
                >
                  이 기기에 예약 푸시 알림 등록
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void testPush()}
                >
                  테스트 알림 보내기
                </button>
              </div>
            </div>
          )}
          <div className="account-panel">
            <h2>{offline ? "로컬 모의 예약 요청" : "모의 예약 요청"}</h2>
            <form onSubmit={(e) => void create(e)}>
              <label>
                레스토랑 이름
                <input
                  required
                  minLength={2}
                  value={restaurant}
                  onChange={(e) => setRestaurant(e.target.value)}
                />
              </label>
              <label>
                방문 일시
                <input
                  type="datetime-local"
                  required
                  value={visit}
                  onChange={(e) => setVisit(e.target.value)}
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
              <button disabled={busy || !visit}>
                모의 예약 승인 요청 만들기 (수동 입력)
              </button>
            </form>
          </div>
          <div className="account-panel">
            <h2>{offline ? "이 브라우저의 시연 예약" : "내 예약 승인 내역"}</h2>
            <div
              className="d-booking-filters"
              role="group"
              aria-label="예약 상태별 보기"
            >
              {(
                [
                  ["all", "전체"],
                  ["pending", "승인 대기"],
                  ["completed", "처리 내역"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={listFilter === key}
                  onClick={() => setListFilter(key)}
                >
                  {label}
                  {key === "pending" &&
                  items.some((item) => item.status === "approval_pending")
                    ? ` (${items.filter((item) => item.status === "approval_pending").length})`
                    : ""}
                </button>
              ))}
            </div>
            {filteredItems.length === 0 ? (
              <p>
                {listFilter === "pending"
                  ? "승인을 기다리는 요청이 없습니다."
                  : "표시할 예약 요청이 없습니다."}
              </p>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="booking-entry">
                  <strong>{item.restaurant}</strong>
                  <span>
                    {pretty(item.status)} ·{" "}
                    {new Date(item.visit_at).toLocaleString("ko-KR")} ·{" "}
                    {item.party_size}명
                  </span>
                  {item.status === "demo_confirmed" && (
                    <small>
                      실제 식당 예약은 생성되지 않았습니다.{" "}
                      {confirmationCodes[item.id] || item.confirmation_code
                        ? `테스트 번호: ${confirmationCodes[item.id] || item.confirmation_code}`
                        : ""}
                    </small>
                  )}
                  {!offline && item.status === "demo_approved" && (
                    <div className="booking-buttons">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void executeDemo(item.id)}
                      >
                        승인된 요청 모의 실행
                      </button>
                      <span className="account-note">
                        가상 제공자에서만 실행 · 결제 없음
                      </span>
                    </div>
                  )}
                  {item.status === "approval_pending" && (
                    <div className="booking-buttons">
                      <button
                        disabled={busy}
                        onClick={() => void decide(item.id, "approve")}
                      >
                        {offline ? "로컬 모의 승인" : "모의 승인"}
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void decide(item.id, "reject")}
                      >
                        거절
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}
      {notice && (
        <p role="status" className="account-note">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="account-error">
          {error}
        </p>
      )}
    </section>
  );
}

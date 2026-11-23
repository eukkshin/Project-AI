"use client";
import { useEffect, useState } from "react";

import { api, Booking, token } from "@/lib/accountApi";

type ApiList = { items: Booking[] };
const pretty = (s: string) =>
  (
    ({
      approval_pending: "승인 대기",
      demo_approved: "모의 승인 완료",
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
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(false);
  const [listFilter, setListFilter] = useState<"all" | "pending" | "completed">("all");
  const filteredItems = items.filter(item => listFilter === "all" || (listFilter === "pending" ? item.status === "approval_pending" : item.status !== "approval_pending"));
  async function refresh() {
    try {
      const data = await api<ApiList>("/api/bookings/demo");
      setItems(data.items);
      window.dispatchEvent(new Event("dinovo:bookings-changed"));
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "예약 정보를 불러오지 못했습니다.",
      );
    }
  }
  useEffect(() => {
    setSigned(Boolean(token()));
    if (token()) void refresh();
  }, []);
  async function enablePush() {
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
  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await api("/api/bookings/demo", {
        method: "POST",
        body: JSON.stringify({
          restaurant,
          party_size: party,
          visit_at: new Date(visit).toISOString(),
        }),
      });
      await refresh();
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
      await api(`/api/bookings/demo/${id}/decision?decision=${decision}`, {
        method: "POST",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "처리 실패");
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
          예약 Agent 승인 절차를 테스트합니다. 실제 예약 및 결제는 발생하지
          않습니다.
        </p>
      </header>
      {!signed ? (
        <div className="account-panel">
          <p>예약 작업은 로그인 계정별로 관리합니다.</p>
          <button onClick={goAccount}>로그인하러 가기</button>
        </div>
      ) : (
        <>
          <div className="account-panel">
            <h2>알림 설정</h2>
            <p className="account-note">
              HTTPS 환경에서 기기별 Web Push를 활성화할 수 있습니다. iPhone은 홈
              화면에 설치한 PWA에서 사용하세요.
            </p>
            <button onClick={() => void enablePush()}>
              이 기기에 예약 푸시 알림 등록
            </button>
          </div>
          <div className="account-panel">
            <h2>모의 예약 요청</h2>
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
                모의 예약 승인 요청 만들기
              </button>
            </form>
          </div>
          <div className="account-panel">
            <h2>내 예약 승인 내역</h2>
            <div className="d-booking-filters" role="group" aria-label="예약 상태별 보기">{([["all","전체"],["pending","승인 대기"],["completed","처리 내역"]] as const).map(([key,label])=><button key={key} type="button" aria-pressed={listFilter === key} onClick={()=>setListFilter(key)}>{label}{key==="pending" && items.some(item=>item.status==="approval_pending") ? ` (${items.filter(item=>item.status==="approval_pending").length})` : ""}</button>)}</div>
            {filteredItems.length === 0 ? (
              <p>{listFilter === "pending" ? "승인을 기다리는 요청이 없습니다." : "표시할 예약 요청이 없습니다."}</p>
            ) : (
              filteredItems.map((item) => (
                <div key={item.id} className="booking-entry">
                  <strong>{item.restaurant}</strong>
                  <span>
                    {pretty(item.status)} ·{" "}
                    {new Date(item.visit_at).toLocaleString("ko-KR")} ·{" "}
                    {item.party_size}명
                  </span>
                  {item.status === "approval_pending" && (
                    <div className="booking-buttons">
                      <button
                        disabled={busy}
                        onClick={() => void decide(item.id, "approve")}
                      >
                        모의 승인
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

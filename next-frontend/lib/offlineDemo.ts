/** Explicit, browser-local presentation mode. Never sends a reservation or push. */
export type LocalDemoBooking = {
  id: string;
  restaurant: string;
  visit_at: string;
  party_size: number;
  status: "approval_pending" | "demo_approved" | "rejected";
  expires_at: string;
};
const FLAG = "dinovo:offline-demo:enabled";
const ITEMS = "dinovo:offline-demo:bookings:v1";

export function offlineDemoEnabled(): boolean {
  return typeof window !== "undefined" && localStorage.getItem(FLAG) === "1";
}
export function setOfflineDemoEnabled(enabled: boolean): void {
  localStorage.setItem(FLAG, enabled ? "1" : "0");
  window.dispatchEvent(new Event("dinovo:offline-demo-changed"));
}
export function listOfflineBookings(): LocalDemoBooking[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(ITEMS) || "[]");
    if (!Array.isArray(stored)) return [];
    return stored.filter(
      (item): item is LocalDemoBooking =>
        item !== null &&
        typeof item === "object" &&
        typeof item.id === "string" &&
        typeof item.restaurant === "string" &&
        typeof item.visit_at === "string" &&
        typeof item.party_size === "number" &&
        ["approval_pending", "demo_approved", "rejected"].includes(item.status),
    );
  } catch {
    return [];
  }
}
function save(items: LocalDemoBooking[]): void {
  localStorage.setItem(ITEMS, JSON.stringify(items));
  window.dispatchEvent(new Event("dinovo:offline-demo-changed"));
}
export function createOfflineBooking(
  restaurant: string,
  visitAt: string,
  partySize: number,
): LocalDemoBooking {
  const visit = new Date(visitAt);
  if (
    !restaurant.trim() ||
    restaurant.trim().length < 2 ||
    restaurant.length > 100 ||
    !Number.isInteger(partySize) ||
    partySize < 1 ||
    partySize > 12 ||
    !Number.isFinite(visit.getTime()) ||
    visit.getTime() <= Date.now()
  ) {
    throw new Error("식당명·미래의 방문 일시·인원을 확인해 주세요.");
  }
  const item: LocalDemoBooking = {
    id:
      globalThis.crypto?.randomUUID?.() ??
      `local-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    restaurant: restaurant.trim(),
    visit_at: visit.toISOString(),
    party_size: partySize,
    status: "approval_pending",
    expires_at: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
  save([item, ...listOfflineBookings()]);
  return item;
}
export function decideOfflineBooking(
  id: string,
  decision: "approve" | "reject",
): void {
  const items = listOfflineBookings();
  const item = items.find((x) => x.id === id);
  if (!item || item.status !== "approval_pending")
    throw new Error("이미 처리되었거나 찾을 수 없는 요청입니다.");
  if (new Date(item.expires_at).getTime() <= Date.now())
    throw new Error("승인 유효 시간이 지났습니다.");
  save(
    items.map((x) =>
      x.id === id
        ? {
            ...x,
            status: decision === "approve" ? "demo_approved" : "rejected",
          }
        : x,
    ),
  );
}
export function clearOfflineBookings(): void {
  save([]);
}

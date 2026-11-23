const BASE = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");
export type User = { id: number; email: string; display_name: string };
export type Booking = {
  id: string;
  restaurant: string;
  visit_at: string;
  party_size: number;
  status: string;
  expires_at: string;
  confirmation_code?: string | null;
};
export function token() {
  return typeof window === "undefined"
    ? ""
    : (sessionStorage.getItem("dinovo_demo_access") ?? "");
}
export function storeToken(value: string) {
  sessionStorage.setItem("dinovo_demo_access", value);
}
export function clearToken() {
  sessionStorage.removeItem("dinovo_demo_access");
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token() ? { Authorization: `Bearer ${token()}` } : {}),
      ...options.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) {
    let msg = `요청 실패 (${response.status})`;
    try {
      const body = await response.json();
      if (typeof body.detail === "string") msg = body.detail;
    } catch {}
    throw new Error(msg);
  }
  return response.json() as Promise<T>;
}

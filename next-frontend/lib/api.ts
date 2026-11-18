import type { ChatMessage, ChatResponse, PlaceInfo } from "@/lib/types";
import { safeHttpUrl } from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function parsePlace(input: unknown): PlaceInfo | null {
  if (typeof input !== "object" || input === null) return null;
  const p = input as Record<string, unknown>;
  if (
    typeof p.name !== "string" ||
    !p.name.trim() ||
    typeof p.address !== "string" ||
    !p.address.trim()
  )
    return null;
  const lat = typeof p.lat === "number" ? p.lat : Number(p.lat);
  const lng = typeof p.lng === "number" ? p.lng : Number(p.lng);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    lat < -90 ||
    lat > 90 ||
    lng < -180 ||
    lng > 180
  )
    return null;
  return {
    id: String(p.id ?? ""),
    name: p.name,
    address: p.address,
    lat,
    lng,
    category: String(p.category ?? "장소"),
    description: String(p.description ?? ""),
    is_registered: p.is_registered === true,
    phone: String(p.phone ?? ""),
    place_url: safeHttpUrl(p.place_url) ?? "",
    source: String(p.source ?? ""),
    booking_url: safeHttpUrl(p.booking_url) ?? "",
    waitlist_url: safeHttpUrl(p.waitlist_url) ?? "",
  };
}

function parseChatResponse(data: unknown): ChatResponse {
  if (typeof data !== "object" || data === null)
    throw new ApiError("서버 응답 형식이 올바르지 않습니다.");
  const d = data as Record<string, unknown>;
  if (typeof d.reply !== "string")
    throw new ApiError("서버의 답변 형식이 올바르지 않습니다.");
  const places = Array.isArray(d.places)
    ? d.places
        .map(parsePlace)
        .filter((p: PlaceInfo | null): p is PlaceInfo => p !== null)
        .slice(0, 10)
    : [];
  return {
    reply: d.reply,
    show_map: d.show_map === true && places.length > 0,
    places,
    suggested_questions: Array.isArray(d.suggested_questions)
      ? d.suggested_questions
          .filter(
            (q: unknown): q is string =>
              typeof q === "string" && q.length <= 100,
          )
          .slice(0, 3)
      : [],
  };
}

export async function postChat(
  message: string,
  district: string,
  history: ChatMessage[],
  signal: AbortSignal,
): Promise<ChatResponse> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        district,
        history: history
          .slice(-10)
          .map((item) => ({
            role: item.sender,
            content: item.text.slice(0, 2000),
          })),
      }),
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError(
      "AI 서버에 연결할 수 없습니다. FastAPI 실행 상태를 확인해 주세요.",
    );
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      if (typeof body?.detail === "string") detail = body.detail;
    } catch {
      /* non-JSON errors */
    }
    if (response.status === 422)
      throw new ApiError("요청 데이터가 올바르지 않습니다.", 422);
    if (response.status === 429)
      throw new ApiError(
        "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.",
        429,
      );
    throw new ApiError(
      detail || `서버 오류가 발생했습니다. (${response.status})`,
      response.status,
    );
  }
  try {
    return parseChatResponse(await response.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError("응답을 해석하지 못했습니다.");
  }
}

export interface SearchResponse {
  query: string;
  district: string;
  places: PlaceInfo[];
  source: string;
}

export async function searchRestaurants(
  args: {
    query: string;
    district: string;
    category: string;
    lat?: number;
    lng?: number;
    radius?: number;
    sort?: string;
  },
  signal: AbortSignal,
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    query: args.query,
    district: args.district,
    category: args.category,
  });
  if (args.lat !== undefined && args.lng !== undefined) {
    params.set("lat", String(args.lat));
    params.set("lng", String(args.lng));
    params.set("radius", String(args.radius ?? 5000));
    params.set("sort", args.sort ?? "distance");
  }
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/restaurants/search?${params}`, {
      signal,
      cache: "no-store",
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new ApiError(
      "검색 서버에 연결할 수 없습니다. FastAPI 실행 여부를 확인해 주세요.",
    );
  }
  if (!response.ok) {
    let detail = "";
    try {
      const data = await response.json();
      if (typeof data?.detail === "string") detail = data.detail;
    } catch {}
    throw new ApiError(
      detail || `검색 오류 (${response.status})`,
      response.status,
    );
  }
  const data = await response.json();
  return {
    query: args.query,
    district: args.district,
    source: "kakao",
    places: Array.isArray(data.places)
      ? data.places
          .map(parsePlace)
          .filter((p: PlaceInfo | null): p is PlaceInfo => p !== null)
      : [],
  };
}

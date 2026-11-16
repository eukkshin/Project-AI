export type ChatRole = "user" | "assistant";
export type ThemeChoice = "light" | "dark" | "system";
export type MobileView = "chat" | "map";

export interface ChatMessage {
  id: string;
  sender: ChatRole;
  text: string;
  createdAt: number;
}

export interface PlaceInfo {
  id: string;
  name: string;
  category: string;
  address: string;
  lat: number;
  lng: number;
  is_registered: boolean;
  description: string;
  phone: string;
  place_url: string;
  source: string;
}

export interface ChatResponse {
  reply: string;
  show_map: boolean;
  places: PlaceInfo[];
  suggested_questions: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  places: PlaceInfo[];
  showMap: boolean;
  suggestedQuestions: string[];
  updatedAt: number;
}

export const DISTRICTS = [
  "노원구",
  "도봉구",
  "강북구",
  "중랑구",
  "성북구",
] as const;

export function placeKey(place: PlaceInfo): string {
  return place.id ? `kakao:${place.id}` : `${place.name}|${place.address}`;
}

export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function mapPlaceUrl(place: PlaceInfo): string {
  const candidate = safeHttpUrl(place.place_url);
  if (candidate) {
    try {
      const host = new URL(candidate).hostname.toLowerCase();
      if (host === "map.kakao.com" || host === "place.map.kakao.com")
        return candidate;
    } catch {
      /* use a safe Kakao search URL */
    }
  }
  return `https://map.kakao.com/?q=${encodeURIComponent(`${place.name} ${place.address}`)}`;
}

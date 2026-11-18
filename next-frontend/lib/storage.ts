import type { ChatSession, SavedRestaurant } from "@/lib/types";
import { DISTRICTS } from "@/lib/types";

export const STORAGE_KEY = "dinovo-dining-v1";
export interface StoredState {
  district: string;
  saveHistory: boolean;
  sessions: ChatSession[];
  favorites: SavedRestaurant[];
}

export function loadStoredState(): StoredState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const p = parsed as Record<string, unknown>;
    const favorites = Array.isArray(p.favorites)
      ? p.favorites.filter((v) => v && typeof v === "object" && typeof v.name === "string" && v.name.trim().length > 0).slice(0, 100)
      : [];
    const sessions: ChatSession[] = Array.isArray(p.sessions)
      ? p.sessions.filter((s) => s && typeof s.id === "string" && Array.isArray(s.messages)).slice(0, 30).map((s) => ({
          id: s.id, title: typeof s.title === "string" ? s.title.slice(0, 80) : "이전 대화",
          messages: s.messages.filter((m: ChatSession["messages"][number]) => m && typeof m.id === "string" && typeof m.text === "string" && (m.sender === "user" || m.sender === "assistant")).slice(-80),
          places: [], // 외부 장소 API 결과는 로컬 저장소에 축적하지 않음
          showMap: false, updatedAt: Number(s.updatedAt) || Date.now(),
          suggestedQuestions: [],
        }))
      : [];
    return {
      district: typeof p.district === "string" && DISTRICTS.includes(p.district as (typeof DISTRICTS)[number]) ? p.district : "노원구",
      saveHistory: p.saveHistory === true,
      favorites: favorites.map((v: SavedRestaurant) => ({ name: v.name.slice(0, 90), createdAt: Number(v.createdAt) || Date.now() })),
      sessions: p.saveHistory === true ? sessions : [],
    };
  } catch { return null; }
}

export function saveStoredState(state: StoredState): void {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch { /* Safari private mode / full storage - app continues without persistence */ }
}

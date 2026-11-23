"use client";
import { MapPin, Menu } from "lucide-react";

import BookingControls from "@/components/layout/BookingControls";
import { DISTRICTS } from "@/lib/types";

export type View =
  | "home"
  | "chat"
  | "explore"
  | "collections"
  | "journal"
  | "guide"
  | "history"
  | "payments"
  | "account"
  | "bookings";
type Props = {
  district: string;
  onDistrict: (district: string) => void;
  view: View;
  onNavigate: (v: View) => void;
  onSettings: () => void;
  onMenu: () => void;
  onLogin: () => void;
};
export default function Topbar({
  district,
  onDistrict,
  onNavigate,
  onSettings,
  onMenu,
}: Props) {
  return (
    <header className="d-topbar">
      <div className="d-topbar-start">
        <button
          type="button"
          className="d-menu-toggle"
          onClick={onMenu}
          aria-label="사이드바 열기"
        >
          <Menu size={20} />
        </button>
        <button
          type="button"
          className="d-wordmark"
          onClick={() => onNavigate("home")}
        >
          DINOVO<span>AI DINING CONCIERGE</span>
        </button>
      </div>
      <div className="d-topbar-actions">
        <label className="d-district">
          <MapPin size={15} />
          <span className="sr-only">검색 지역</span>
          <select value={district} onChange={(e) => onDistrict(e.target.value)}>
            {DISTRICTS.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </label>
        <BookingControls onNavigate={onNavigate} onSettings={onSettings} />
      </div>
    </header>
  );
}

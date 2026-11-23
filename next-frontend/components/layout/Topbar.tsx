"use client";
import { Menu } from "lucide-react";

import BookingControls from "@/components/layout/BookingControls";

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
  view: View;
  onNavigate: (v: View) => void;
  onSettings: () => void;
  onMenu: () => void;
  onLogin: () => void;
};
export default function Topbar({ onNavigate, onSettings, onMenu }: Props) {
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
        <BookingControls onNavigate={onNavigate} onSettings={onSettings} />
      </div>
    </header>
  );
}

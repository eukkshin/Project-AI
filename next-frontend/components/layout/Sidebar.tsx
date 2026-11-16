"use client";

import {
  ArrowUpRight,
  Bookmark,
  Compass,
  History,
  MessageCircle,
  Plus,
  Settings2,
  Sparkles,
  X,
} from "lucide-react";

import type { ChatSession } from "@/lib/types";

type View = "chat" | "favorites" | "history";
interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  favoritesCount: number;
  view: View;
  open: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onNavigate: (view: View) => void;
  onSettings: () => void;
  onClose: () => void;
}

export default function Sidebar({
  sessions,
  activeSessionId,
  favoritesCount,
  view,
  open,
  onNew,
  onSelect,
  onNavigate,
  onSettings,
  onClose,
}: Props) {
  const recent = sessions
    .filter((s) => s.messages.length > 0)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 7);
  return (
    <>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="메뉴 닫기"
          onClick={onClose}
        />
      )}
      <aside className={`sidebar ${open ? "sidebar-open" : ""}`}>
        <div className="sidebar-mobile-head">
          <span>메뉴</span>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <button className="new-chat" onClick={onNew}>
          <Plus size={18} /> 새 대화 시작
        </button>
        <nav className="side-nav" aria-label="주요 메뉴">
          <button
            className={`side-link ${view === "chat" ? "active" : ""}`}
            onClick={() => onNavigate("chat")}
          >
            <Compass size={18} /> 홈
          </button>
          <button
            className={`side-link ${view === "favorites" ? "active" : ""}`}
            onClick={() => onNavigate("favorites")}
          >
            <Bookmark size={18} /> 즐겨찾기{" "}
            <span className="side-count">{favoritesCount}</span>
          </button>
          <button
            className={`side-link ${view === "history" ? "active" : ""}`}
            onClick={() => onNavigate("history")}
          >
            <History size={18} /> 대화 기록
          </button>
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-heading">
          <span>최근 대화</span>
          <button type="button" onClick={() => onNavigate("history")}>
            전체 보기 <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="recent-list">
          {recent.length ? (
            recent.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`recent-item ${view === "chat" && activeSessionId === s.id ? "selected" : ""}`}
                onClick={() => onSelect(s.id)}
                title={s.title}
              >
                <MessageCircle size={15} />
                <span>{s.title}</span>
              </button>
            ))
          ) : (
            <p className="sidebar-empty">대화를 시작하면 이곳에 표시됩니다.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <div className="sidebar-help">
            <span className="sidebar-help-icon">
              <Sparkles size={18} />
            </span>
            <strong>우리 동네, 더 쉽게</strong>
            <p>AI에게 원하는 장소를 자연스럽게 물어보세요.</p>
          </div>
          <button className="side-link settings-link" onClick={onSettings}>
            <Settings2 size={18} /> 설정
          </button>
        </div>
      </aside>
    </>
  );
}

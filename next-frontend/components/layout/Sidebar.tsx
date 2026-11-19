"use client";
import {
  ArrowUpRight,
  BookHeart,
  Bookmark,
  BookOpen,
  CalendarCheck,
  Compass,
  CreditCard,
  History,
  LogIn,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import { api, token, User } from "@/lib/accountApi";

import type { ChatSession } from "@/lib/types";
import type { View } from "@/components/layout/Topbar";
interface Props {
  sessions: ChatSession[];
  activeSessionId: string | null;
  favoritesCount: number;
  view: View;
  open: boolean;
  onNew: () => void;
  onSelect: (id: string) => void;
  onNavigate: (v: View) => void;
  onSettings: () => void;
  onClose: () => void;
}
const NAV = [
  { key: "home", label: "홈", Icon: Compass },
  { key: "chat", label: "AI 미식 컨시어지", Icon: Sparkles },
  { key: "explore", label: "식당 탐색", Icon: Search },
  { key: "collections", label: "내 컬렉션", Icon: Bookmark },
  { key: "journal", label: "미식 다이어리", Icon: BookHeart },
  { key: "guide", label: "미식 가이드", Icon: BookOpen },
  { key: "history", label: "대화 기록", Icon: History },
  { key: "payments", label: "결제수단", Icon: CreditCard },
  { key: "bookings", label: "예약 승인", Icon: CalendarCheck },
] as const;
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
  const [account, setAccount] = useState<User | null>(null);
  useEffect(() => {
    let mounted = true;
    async function check() {
      if (!token()) {
        if (mounted) setAccount(null);
        return;
      }
      try {
        const result = await api<{ user: User }>("/api/auth/me");
        if (mounted) setAccount(result.user);
      } catch {
        if (mounted) setAccount(null);
      }
    }
    void check();
    window.addEventListener("dinovo:auth-changed", check);
    const onFocus = () => void check();
    window.addEventListener("focus", onFocus);
    return () => {
      mounted = false;
      window.removeEventListener("dinovo:auth-changed", check);
      window.removeEventListener("focus", onFocus);
    };
  }, []);
  const recent = sessions
    .filter((s) => s.messages.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 7);
  return (
    <>
      <>
        {open && (
          <button
            className="sidebar-scrim"
            aria-label="메뉴 닫기"
            onClick={onClose}
          />
        )}
      </>
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
          <Plus size={18} /> 새로운 미식 대화
        </button>
        <nav className="side-nav" aria-label="사이드 메뉴">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              className={`side-link ${view === key ? "active" : ""}`}
              onClick={() => onNavigate(key)}
            >
              <Icon size={18} />
              {label}
              {key === "collections" && (
                <span className="side-count">{favoritesCount}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-divider" />
        <div className="sidebar-heading">
          <span>최근 대화</span>
          <button type="button" onClick={() => onNavigate("history")}>
            모두 보기 <ArrowUpRight size={14} />
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
            <p className="sidebar-empty">대화를 시작하면 여기에 나타납니다.</p>
          )}
        </div>
        <div className="sidebar-bottom">
          <button
            type="button"
            className={`sidebar-account ${view === "account" ? "active" : ""}`}
            onClick={() => onNavigate("account")}
          >
            <span className="sidebar-account-avatar">
              {account ? <UserRound size={20} /> : <LogIn size={20} />}
            </span>
            <span className="sidebar-account-label">
              <strong>
                {account ? account.display_name : "로그인 / 회원가입"}
              </strong>
              <small>
                {account ? "내 계정 및 프로필" : "DINOVO 계정 시작하기"}
              </small>
            </span>
            <ArrowUpRight size={16} />
          </button>
          <button className="side-link settings-link" onClick={onSettings}>
            <Settings2 size={18} /> 환경 설정
          </button>
        </div>
      </aside>
    </>
  );
}

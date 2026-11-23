"use client";

import {
  ArrowRight,
  BookHeart,
  Bookmark,
  BookOpen,
  Bug,
  CalendarCheck,
  ChevronRight,
  ChevronUp,
  CircleUserRound,
  Compass,
  CreditCard,
  FileText,
  HelpCircle,
  History,
  LogIn,
  LogOut,
  MessageCircle,
  Plus,
  Search,
  Settings2,
  Shield,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { api, clearToken, token, User } from "@/lib/accountApi";

import type { ChatSession } from "@/lib/types";
import type { View } from "@/components/layout/Topbar";
import type { ProfilePanel } from "@/components/layout/ProfileDialog";

type Props = {
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
  onLogin: () => void;
  onProfilePanel: (panel: ProfilePanel) => void;
};

const NAV = [
  { key: "home", label: "홈", Icon: Compass },
  { key: "chat", label: "AI 컨시어지", Icon: Sparkles },
  { key: "explore", label: "식당 탐색", Icon: Search },
  { key: "collections", label: "내 컬렉션", Icon: Bookmark },
  { key: "journal", label: "미식 다이어리", Icon: BookHeart },
  { key: "guide", label: "미식 가이드", Icon: BookOpen },
  { key: "bookings", label: "내 예약", Icon: CalendarCheck },
  { key: "history", label: "대화 기록", Icon: History },
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
  onLogin,
  onProfilePanel,
}: Props) {
  const [account, setAccount] = useState<User | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    async function refresh() {
      if (!token()) {
        if (active) setAccount(null);
        return;
      }
      try {
        const result = await api<{ user: User }>("/api/auth/me");
        if (active) setAccount(result.user);
      } catch {
        if (active) setAccount(null);
      }
    }
    void refresh();
    window.addEventListener("dinovo:auth-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.removeEventListener("dinovo:auth-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    function update() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(266, window.innerWidth - 24);
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - width - 12),
      );
      const bottom = Math.min(
        window.innerHeight - 12,
        window.innerHeight - rect.top + 8,
      );
      setMenuStyle({ width, left, bottom });
    }
    function outside(event: PointerEvent) {
      if (popupRef.current?.contains(event.target as Node)) return;
      if (buttonRef.current?.contains(event.target as Node)) return;
      setProfileOpen(false);
      setHelpOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setHelpOpen(false);
        buttonRef.current?.focus();
      }
    }
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const recent = [...sessions]
    .filter((s) => s.messages.length)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 7);

  function openPanel(panel: ProfilePanel) {
    setProfileOpen(false);
    setHelpOpen(false);
    onProfilePanel(panel);
  }
  function go(view: View) {
    setProfileOpen(false);
    setHelpOpen(false);
    onNavigate(view);
  }
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* End local session anyway. */
    }
    clearToken();
    setAccount(null);
    setProfileOpen(false);
    setHelpOpen(false);
    window.dispatchEvent(new Event("dinovo:auth-changed"));
  }

  return (
    <>
      {open && (
        <button
          type="button"
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
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <button className="new-chat" type="button" onClick={onNew}>
          <Plus size={18} /> 새로운 미식 대화
        </button>
        <nav className="side-nav" aria-label="사이드 메뉴">
          {NAV.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              className={`side-link ${view === key ? "active" : ""}`}
              aria-current={view === key ? "page" : undefined}
              onClick={() => go(key)}
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
          <button type="button" onClick={() => go("history")}>
            모두 보기 <ArrowRight size={14} />
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
            ref={buttonRef}
            type="button"
            className={`sidebar-account ${profileOpen ? "active" : ""}`}
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => {
              setProfileOpen((v) => !v);
              setHelpOpen(false);
            }}
          >
            <span className="sidebar-account-avatar">
              {account ? <UserRound size={20} /> : <LogIn size={20} />}
            </span>
            <span className="sidebar-account-label">
              <strong>
                {account ? account.display_name : "로그인 / 회원가입"}
              </strong>
              <small>{account ? account.email : "DINOVO 계정"}</small>
            </span>
            <ChevronUp size={17} />
          </button>
        </div>
      </aside>
      {profileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popupRef}
            className="d-profile-menu"
            style={menuStyle}
            role="menu"
            aria-label="내 프로필 메뉴"
          >
            {account ? (
              <>
                <div className="d-profile-summary">
                  <span className="d-profile-initial">
                    {account.display_name.slice(0, 1).toUpperCase()}
                  </span>
                  <div>
                    <strong>{account.display_name}</strong>
                    <small>{account.email}</small>
                  </div>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => openPanel("account")}
                >
                  <CircleUserRound size={17} /> 계정 설정
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setProfileOpen(false);
                    onLogin();
                  }}
                >
                  <LogIn size={17} /> 로그인
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => go("account")}
                >
                  <UserRound size={17} /> 회원가입
                </button>
              </>
            )}
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setProfileOpen(false);
                onSettings();
              }}
            >
              <Settings2 size={17} /> 일반 설정
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => go("payments")}
            >
              <CreditCard size={17} /> 결제수단
            </button>
            <div className="d-profile-divider" />
            <div
              className="d-profile-help-wrap"
              onMouseEnter={() => setHelpOpen(true)}
              onMouseLeave={() => setHelpOpen(false)}
            >
              <button
                type="button"
                role="menuitem"
                aria-haspopup="menu"
                aria-expanded={helpOpen}
                onFocus={() => setHelpOpen(true)}
                onClick={() => setHelpOpen((v) => !v)}
              >
                <HelpCircle size={17} /> 도움말{" "}
                <ChevronRight className="d-profile-chevron" size={16} />
              </button>
              {helpOpen && (
                <div
                  className="d-profile-help-submenu"
                  role="menu"
                  aria-label="도움말 하위 메뉴"
                  onMouseEnter={() => setHelpOpen(true)}
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openPanel("terms")}
                  >
                    <FileText size={16} /> 이용약관
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openPanel("privacy")}
                  >
                    <Shield size={16} /> 개인정보처리방침
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openPanel("bug")}
                  >
                    <Bug size={16} /> 버그 신고
                  </button>
                </div>
              )}
            </div>
            {account && (
              <>
                <div className="d-profile-divider" />
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => void logout()}
                >
                  <LogOut size={17} /> 로그아웃
                </button>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  );
}

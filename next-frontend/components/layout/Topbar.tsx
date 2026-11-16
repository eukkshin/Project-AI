"use client";

import {
  Bookmark,
  Compass,
  History,
  House,
  MapPin,
  Menu,
  Moon,
  Settings2,
  Sun,
} from "lucide-react";

import { useTheme } from "@/components/common/ThemeProvider";
import { DISTRICTS } from "@/lib/types";

type View = "chat" | "favorites" | "history";
interface Props {
  district: string;
  onDistrict: (district: string) => void;
  view: View;
  onNavigate: (view: View) => void;
  onSettings: () => void;
  onMenu: () => void;
}

export default function Topbar({
  district,
  onDistrict,
  view,
  onNavigate,
  onSettings,
  onMenu,
}: Props) {
  const { resolved, toggle } = useTheme();
  return (
    <header className="topbar">
      <div className="topbar-brand-group">
        <button
          className="icon-button menu-toggle"
          onClick={onMenu}
          aria-label="메뉴 열기"
        >
          <Menu size={21} />
        </button>
        <div className="brand-mark" aria-hidden="true">
          <House size={20} strokeWidth={2.2} />
        </div>
        <div className="brand-name">
          <strong>동네 AI</strong>
          <span>우리 동네를 더 잘 아는 AI</span>
        </div>
      </div>
      <nav className="top-nav" aria-label="상단 메뉴">
        <button
          className={view === "chat" ? "active" : ""}
          onClick={() => onNavigate("chat")}
        >
          <Compass size={17} /> 홈
        </button>
        <button
          className={view === "favorites" ? "active" : ""}
          onClick={() => onNavigate("favorites")}
        >
          <Bookmark size={17} /> 즐겨찾기
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => onNavigate("history")}
        >
          <History size={17} /> 대화 기록
        </button>
      </nav>
      <div className="top-actions">
        <label className="district-select">
          <MapPin size={16} />
          <span className="sr-only">지역 선택</span>
          <select value={district} onChange={(e) => onDistrict(e.target.value)}>
            {DISTRICTS.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          className="icon-button theme-toggle"
          onClick={toggle}
          aria-label={
            resolved === "light" ? "다크 모드로 변경" : "라이트 모드로 변경"
          }
          title="테마 전환"
        >
          {resolved === "light" ? <Moon size={19} /> : <Sun size={19} />}
        </button>
        <button
          className="icon-button top-settings"
          onClick={onSettings}
          aria-label="환경 설정"
        >
          <Settings2 size={19} />
        </button>
      </div>
    </header>
  );
}

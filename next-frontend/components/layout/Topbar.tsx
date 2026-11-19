"use client";
import { MapPin, Menu, Sparkles } from "lucide-react";
import Image from "next/image";
import BookingControls from "@/components/layout/BookingControls";
import { DISTRICTS } from "@/lib/types";

export type View = "home" | "chat" | "explore" | "collections" | "journal" | "guide" | "history" | "payments" | "account" | "bookings";
interface Props { district: string; onDistrict: (district: string) => void; view: View; onNavigate: (v: View) => void; onSettings: () => void; onMenu: () => void }
export default function Topbar({ district, onDistrict, view, onNavigate, onSettings, onMenu }: Props) {
  return <header className="topbar">
    <div className="topbar-brand-group"><button className="icon-button menu-toggle" onClick={onMenu} aria-label="메뉴 열기"><Menu size={20}/></button><button className="brand-link" onClick={() => onNavigate("home")}><span className="brand-mark"><Image src="/group/three/3/brand/brand-symbol.png" alt="" width={31} height={31} priority /></span><span className="brand-name"><strong>{process.env.NEXT_PUBLIC_BRAND_NAME || "DINOVO"}</strong><span>PERSONAL DINING GUIDE</span></span></button></div>
    <nav className="top-nav" aria-label="메인 메뉴"><button className={view === "home" ? "active" : ""} onClick={() => onNavigate("home")}>홈</button><button className={view === "chat" ? "active" : ""} onClick={() => onNavigate("chat")}><Sparkles size={15}/> AI 컨시어지</button><button className={view === "explore" ? "active" : ""} onClick={() => onNavigate("explore")}>식당 탐색</button><button className={view === "guide" ? "active" : ""} onClick={() => onNavigate("guide")}>미식 가이드</button></nav>
    <div className="top-actions"><label className="district-select"><MapPin size={16}/><span className="sr-only">검색 지역</span><select value={district} onChange={e => onDistrict(e.target.value)}>{DISTRICTS.map(d => <option key={d}>{d}</option>)}</select></label><BookingControls onNavigate={onNavigate} onSettings={onSettings}/></div>
  </header>;
}

"use client";

import { Sparkles } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import LoginModal from "@/components/auth/LoginModal";
import ChatPanel from "@/components/chat/ChatPanel";
import SettingsDialog from "@/components/common/SettingsDialog";
import ProfileDialog, { ProfilePanel } from "@/components/layout/ProfileDialog";
import Sidebar from "@/components/layout/Sidebar";
import Topbar, { View } from "@/components/layout/Topbar";
import MapPanel from "@/components/map/MapPanel";
import AccountView from "@/components/views/AccountView";
import BookingsView from "@/components/views/BookingsView";
import CollectionsView from "@/components/views/CollectionsView";
import ExploreView from "@/components/views/ExploreView";
import GuideView from "@/components/views/GuideView";
import HistoryView from "@/components/views/HistoryView";
import HomeView from "@/components/views/HomeView";
import JournalView from "@/components/views/JournalView";
import PaymentsView from "@/components/views/PaymentsView";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useChatController } from "@/hooks/useChatController";
import { BookingDraft, parseBookingIntent } from "@/lib/bookingIntent";
import { offlineDemoEnabled } from "@/lib/offlineDemo";
import { setInputText, setMobileView } from "@/store/chatSlice";

// Cafe24 static hosting: Next.js basePath is compiled into the build.
const BASE_PATH = "/group/three/3";
const PATHS: Record<View, string> = {
  home: "/",
  chat: "/chat",
  explore: "/explore",
  collections: "/collections",
  journal: "/journal",
  guide: "/guide",
  history: "/history",
  payments: "/payments",
  account: "/account",
  bookings: "/bookings",
};

function viewFromPath(pathname: string | null): View {
  let path = pathname || "/";
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) {
    path = path.slice(BASE_PATH.length) || "/";
  }
  path = path.replace(/\/+$/, "") || "/";
  const match = (Object.keys(PATHS) as View[]).find(
    (key) => PATHS[key] === path,
  );
  return match ?? "home";
}

function urlFor(view: View): string {
  const path = PATHS[view];
  return path === "/" ? `${BASE_PATH}/` : `${BASE_PATH}${path}/`;
}

export default function AppShell() {
  const dispatch = useAppDispatch();
  const nextPathname = usePathname();
  const [view, setView] = useState<View>(() => viewFromPath(nextPathname));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profilePanel, setProfilePanel] = useState<ProfilePanel | null>(null);
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);

  const { sessions, activeSessionId, favorites, mobileView, hydrated } =
    useAppSelector((state) => state.chat);
  const { activeSession, startNew, openSession, send, retryLast, cancel } =
    useChatController();

  // Keep navigation independent of Next.js RSC requests on a static FTP host.
  // This also keeps Redux conversations alive when switching tabs.
  useEffect(() => {
    const syncFromLocation = () =>
      setView(viewFromPath(window.location.pathname));
    syncFromLocation();
    window.addEventListener("popstate", syncFromLocation);
    return () => window.removeEventListener("popstate", syncFromLocation);
  }, []);

  function navigate(nextView: View) {
    setSidebarOpen(false);
    if (nextView === "chat") dispatch(setMobileView("chat"));

    const target = urlFor(nextView);
    if (window.location.pathname !== target) {
      window.history.pushState({ ...window.history.state }, "", target);
    }
    setView(nextView);
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  function openChat(id: string) {
    setBookingDraft(null);
    openSession(id);
    navigate("chat");
  }

  function newChat() {
    setBookingDraft(null);
    startNew();
    navigate("chat");
  }

  function sendFromConcierge(query: string) {
    const draft = parseBookingIntent(query);
    if (draft) setBookingDraft(draft);
    // In explicit local demo mode, booking phrases open the booking card without calling Render.
    if (!(draft && offlineDemoEnabled())) void send(query);
  }

  function prompt(text: string) {
    dispatch(setInputText(text));
    navigate("chat");
  }

  if (!hydrated) {
    return (
      <div className="initial-loading">
        <div className="brand-mark">
          <Image
            src={`${BASE_PATH}/brand/brand-symbol.png`}
            alt=""
            width={31}
            height={31}
          />
        </div>
        <span>미식의 순간을 준비하고 있어요</span>
      </div>
    );
  }

  // Sign-up is a clean, full-screen flow. Other pages use a shared top navigation.
  if (view === "account") {
    return (
      <>
        <AccountView
          onBack={() => navigate("home")}
          onLogin={() => setLoginOpen(true)}
        />
        {loginOpen && (
          <LoginModal
            onClose={() => setLoginOpen(false)}
            onRegister={() => setLoginOpen(false)}
          />
        )}
      </>
    );
  }
  // Desktop sidebar is persistent across all app views; registration stays standalone.
  const showChatSidebar = true;
  return (
    <div className="app-shell d-shell">
      <Topbar
        view={view}
        onNavigate={navigate}
        onSettings={() => setSettingsOpen(true)}
        onMenu={() => setSidebarOpen(true)}
        onLogin={() => setLoginOpen(true)}
      />
      <div
        className={`app-content d-content ${!showChatSidebar ? "d-no-sidebar" : ""} ${view !== "chat" ? "app-content-secondary" : ""} ${mobileView === "map" && view === "chat" ? "show-mobile-map" : ""}`}
      >
        {(showChatSidebar || sidebarOpen) && (
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            favoritesCount={favorites.length}
            view={view}
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onNew={newChat}
            onSelect={openChat}
            onNavigate={navigate}
            onLogin={() => {
              setSidebarOpen(false);
              setLoginOpen(true);
            }}
            onSettings={() => {
              setSidebarOpen(false);
              setSettingsOpen(true);
            }}
            onProfilePanel={(panel) => {
              setSidebarOpen(false);
              setProfilePanel(panel);
            }}
          />
        )}
        {view === "chat" ? (
          <>
            <ChatPanel
              session={activeSession}
              send={sendFromConcierge}
              retry={retryLast}
              onCancel={cancel}
              bookingDraft={bookingDraft}
              onLogin={() => setLoginOpen(true)}
              onManageBookings={() => navigate("bookings")}
            />
            <MapPanel session={activeSession} />
          </>
        ) : view === "home" ? (
          <HomeView onPrompt={prompt} onExplore={() => navigate("explore")} />
        ) : view === "explore" ? (
          <ExploreView />
        ) : view === "collections" ? (
          <CollectionsView />
        ) : view === "journal" ? (
          <JournalView />
        ) : view === "guide" ? (
          <GuideView onPrompt={prompt} />
        ) : view === "payments" ? (
          <PaymentsView />
        ) : view === "bookings" ? (
          <BookingsView goAccount={() => setLoginOpen(true)} />
        ) : (
          <HistoryView onOpen={openChat} onNew={newChat} />
        )}
      </div>
      {profilePanel && (
        <ProfileDialog
          panel={profilePanel}
          onClose={() => setProfilePanel(null)}
          onLogin={() => {
            setProfilePanel(null);
            setLoginOpen(true);
          }}
        />
      )}
      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onClear={() => {
            cancel();
            navigate("chat");
          }}
        />
      )}
      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onRegister={() => {
            setLoginOpen(false);
            navigate("account");
          }}
        />
      )}
      <nav className="d-mobile-nav" aria-label="모바일 빠른 메뉴">
        <button
          type="button"
          aria-current={view === "home" ? "page" : undefined}
          className={view === "home" ? "active" : ""}
          onClick={() => navigate("home")}
        >
          홈
        </button>
        <button
          type="button"
          aria-current={view === "chat" ? "page" : undefined}
          className={view === "chat" ? "active" : ""}
          onClick={() => navigate("chat")}
        >
          <span>
            <Sparkles size={17} aria-hidden="true" />
          </span>
          AI
        </button>
        <button
          type="button"
          aria-current={view === "explore" ? "page" : undefined}
          className={view === "explore" ? "active" : ""}
          onClick={() => navigate("explore")}
        >
          탐색
        </button>
        <button
          type="button"
          aria-current={view === "bookings" ? "page" : undefined}
          className={view === "bookings" ? "active" : ""}
          onClick={() => navigate("bookings")}
        >
          예약
        </button>
      </nav>
    </div>
  );
}

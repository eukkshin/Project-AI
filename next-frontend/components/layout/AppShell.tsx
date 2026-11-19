"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import ChatPanel from "@/components/chat/ChatPanel";
import SettingsDialog from "@/components/common/SettingsDialog";
import Sidebar from "@/components/layout/Sidebar";
import Topbar, { View } from "@/components/layout/Topbar";
import MapPanel from "@/components/map/MapPanel";
import CollectionsView from "@/components/views/CollectionsView";
import ExploreView from "@/components/views/ExploreView";
import GuideView from "@/components/views/GuideView";
import HistoryView from "@/components/views/HistoryView";
import HomeView from "@/components/views/HomeView";
import JournalView from "@/components/views/JournalView";
import PaymentsView from "@/components/views/PaymentsView";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useChatController } from "@/hooks/useChatController";
import { setDistrict, setInputText, setMobileView } from "@/store/chatSlice";

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const {
    sessions,
    activeSessionId,
    selectedDistrict,
    favorites,
    mobileView,
    hydrated,
  } = useAppSelector((state) => state.chat);
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
    openSession(id);
    navigate("chat");
  }

  function newChat() {
    startNew();
    navigate("chat");
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

  return (
    <div className="app-shell">
      <Topbar
        district={selectedDistrict}
        onDistrict={(district) => dispatch(setDistrict(district))}
        view={view}
        onNavigate={navigate}
        onSettings={() => setSettingsOpen(true)}
        onMenu={() => setSidebarOpen(true)}
      />
      <div
        className={`app-content ${view !== "chat" ? "app-content-secondary" : ""} ${mobileView === "map" && view === "chat" ? "show-mobile-map" : ""}`}
      >
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
          onSettings={() => {
            setSidebarOpen(false);
            setSettingsOpen(true);
          }}
        />
        {view === "chat" ? (
          <>
            <ChatPanel
              session={activeSession}
              send={(question) => void send(question)}
              retry={retryLast}
              onCancel={cancel}
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
        ) : (
          <HistoryView onOpen={openChat} onNew={newChat} />
        )}
      </div>
      {settingsOpen && (
        <SettingsDialog
          onClose={() => setSettingsOpen(false)}
          onClear={() => {
            cancel();
            navigate("chat");
          }}
        />
      )}
    </div>
  );
}

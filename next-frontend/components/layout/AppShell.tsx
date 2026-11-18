"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

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
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useChatController } from "@/hooks/useChatController";
import { setDistrict, setInputText, setMobileView } from "@/store/chatSlice";

const paths: Record<View, string> = {
  home: "/",
  chat: "/chat",
  explore: "/explore",
  collections: "/collections",
  journal: "/journal",
  guide: "/guide",
  history: "/history",
};
export default function AppShell() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const view = (Object.keys(paths).find((k) => paths[k as View] === pathname) ||
    "home") as View;
  const {
    sessions,
    activeSessionId,
    selectedDistrict,
    favorites,
    mobileView,
    hydrated,
  } = useAppSelector((s) => s.chat);
  const { activeSession, startNew, openSession, send, retryLast, cancel } =
    useChatController();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  function navigate(v: View) {
    setSidebarOpen(false);
    if (v === "chat") dispatch(setMobileView("chat"));
    router.push(paths[v]);
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
  if (!hydrated)
    return (
      <div className="initial-loading">
        <div className="brand-mark">
          <Image src="/brand/brand-symbol.png" alt="" width={31} height={31} />
        </div>
        <span>미식의 순간을 준비하고 있어요</span>
      </div>
    );
  return (
    <div className="app-shell">
      <Topbar
        district={selectedDistrict}
        onDistrict={(d) => dispatch(setDistrict(d))}
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
              send={(q) => void send(q)}
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

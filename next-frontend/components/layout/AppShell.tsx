"use client";

import {
  ArrowUpRight,
  Bookmark,
  History,
  MapPin,
  MessageCircle,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import ChatPanel from "@/components/chat/ChatPanel";
import SettingsDialog from "@/components/common/SettingsDialog";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import MapPanel from "@/components/map/MapPanel";
import PlaceCard from "@/components/places/PlaceCard";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { useChatController } from "@/hooks/useChatController";
import { mapPlaceUrl, placeKey } from "@/lib/types";
import { deleteSession, setDistrict, setMobileView } from "@/store/chatSlice";

type View = "chat" | "favorites" | "history";

export default function AppShell() {
  const dispatch = useAppDispatch();
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
  const [view, setView] = useState<View>("chat");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function navigate(next: View) {
    setView(next);
    setSidebarOpen(false);
    if (next === "chat") dispatch(setMobileView("chat"));
  }
  function openChat(id: string) {
    openSession(id);
    navigate("chat");
  }
  function newChat() {
    startNew();
    navigate("chat");
  }
  function deleteChat(id: string) {
    cancel();
    dispatch(deleteSession(id));
  }

  if (!hydrated)
    return (
      <div className="initial-loading">
        <div className="brand-mark">
          <MapPin size={22} />
        </div>
        <span>동네 AI를 준비하고 있어요</span>
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
        ) : (
          <main className="secondary-view">
            <div className="secondary-heading">
              <span className="eyebrow">YOUR SPACE</span>
              <h1>{view === "favorites" ? "즐겨찾기" : "대화 기록"}</h1>
              <p>
                {view === "favorites"
                  ? "저장한 장소를 다시 확인할 수 있어요."
                  : "이 브라우저에서 나눈 대화를 이어서 진행하세요."}
              </p>
            </div>
            {view === "favorites" ? (
              favorites.length ? (
                <div className="saved-grid">
                  {favorites.map((place) => (
                    <PlaceCard
                      key={placeKey(place)}
                      place={place}
                      bookmarked
                      selected={false}
                    />
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <Bookmark size={30} />
                  <strong>아직 저장한 장소가 없습니다.</strong>
                  <p>
                    장소를 검색한 다음 북마크 아이콘을 누르면 이곳에 모입니다.
                  </p>
                  <button
                    className="button primary"
                    onClick={() => navigate("chat")}
                  >
                    장소 찾아보기
                  </button>
                </div>
              )
            ) : sessions.some((s) => s.messages.length) ? (
              <div className="history-list">
                {sessions
                  .filter((s) => s.messages.length > 0)
                  .sort((a, b) => b.updatedAt - a.updatedAt)
                  .map((s) => (
                    <article className="history-card" key={s.id}>
                      <button onClick={() => openChat(s.id)}>
                        <MessageCircle size={19} />
                        <span>
                          <strong>{s.title}</strong>
                          <small>
                            {new Date(s.updatedAt).toLocaleDateString("ko-KR")}{" "}
                            · 메시지 {s.messages.length}개
                          </small>
                        </span>
                        <ArrowUpRight size={17} />
                      </button>
                      <button
                        className="delete-chat"
                        title={`${s.title} 삭제`}
                        aria-label={`${s.title} 삭제`}
                        onClick={() => {
                          if (window.confirm("이 대화를 삭제하시겠습니까?"))
                            deleteChat(s.id);
                        }}
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  ))}
              </div>
            ) : (
              <div className="empty-state">
                <History size={30} />
                <strong>대화가 아직 없습니다.</strong>
                <p>첫 질문을 남기면 이곳에서 찾아볼 수 있어요.</p>
                <button className="button primary" onClick={newChat}>
                  새 대화 시작
                </button>
              </div>
            )}
            <div className="secondary-footnote">
              <MapPin size={14} />{" "}
              {view === "history"
                ? "대화 자동 저장은 설정에서 선택할 수 있습니다."
                : "즐겨찾기는 이 브라우저의 로컬 저장소에 저장됩니다."}
            </div>
          </main>
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

"use client";
import { useState } from "react";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { api } from "@/lib/accountApi";
import { importWorkspace } from "@/store/chatSlice";

type RemoteWorkspace = {
  favorites: { name: string; createdAt: number }[];
  conversations: {
    id: string;
    title: string;
    updatedAt: number;
    messages: {
      id: string;
      sender: "user" | "assistant";
      text: string;
      createdAt: number;
    }[];
  }[];
  save_history: boolean;
};
/** Explicit opt-in manual sync prevents surprising cross-account overwrites. */
export default function WorkspaceSync() {
  const chat = useAppSelector((s) => s.chat);
  const dispatch = useAppDispatch();
  const [saveHistory, setSaveHistory] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  async function backup() {
    setBusy(true);
    setStatus("");
    try {
      const payload: RemoteWorkspace = {
        favorites: chat.favorites.slice(0, 100),
        save_history: saveHistory,
        conversations: saveHistory
          ? chat.sessions
              .slice(0, 30)
              .map((s) => ({
                id: s.id,
                title: s.title,
                updatedAt: s.updatedAt,
                messages: s.messages.slice(-80),
              }))
          : [],
      };
      await api("/api/me/workspace", {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus(
        "현재 계정에 데이터를 저장했습니다. Render 무료 SQLite에서는 영구 보존이 보장되지 않습니다.",
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "저장하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (
      !window.confirm(
        "서버에 저장된 내 데이터로 현재 브라우저의 대화·즐겨찾기를 교체할까요?",
      )
    )
      return;
    setBusy(true);
    setStatus("");
    try {
      const data = await api<{ workspace: RemoteWorkspace }>(
        "/api/me/workspace",
      );
      dispatch(importWorkspace(data.workspace));
      setStatus("계정 데이터 복원이 완료됐습니다.");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "복원하지 못했습니다.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="d-workspace-sync">
      <h3>내 데이터 백업 · 복원</h3>
      <p>
        즐겨찾기를 계정에 저장합니다. 대화 기록은 동의한 경우에만 업로드합니다.
      </p>
      <label>
        <input
          type="checkbox"
          checked={saveHistory}
          onChange={(e) => setSaveHistory(e.target.checked)}
        />{" "}
        AI 대화 기록도 계정에 저장하기
      </label>
      <div className="d-workspace-actions">
        <button type="button" disabled={busy} onClick={() => void backup()}>
          서버에 저장
        </button>
        <button type="button" disabled={busy} onClick={() => void restore()}>
          서버에서 복원
        </button>
      </div>
      {status && <p role="status">{status}</p>}
    </div>
  );
}

"use client";
import { ArrowUpRight, History, MessageCircle, Trash2 } from "lucide-react";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { deleteSession } from "@/store/chatSlice";

export default function HistoryView({
  onOpen,
  onNew,
}: {
  onOpen: (id: string) => void;
  onNew: () => void;
}) {
  const sessions = useAppSelector((s) =>
    s.chat.sessions.filter((s) => s.messages.length),
  );
  const dispatch = useAppDispatch();
  return (
    <main className="content-view history-view">
      <span className="eyebrow">PAST CONVERSATIONS</span>
      <div className="page-title-row">
        <div>
          <h1>대화 기록</h1>
          <p>대화 기록 저장은 환경 설정에서 선택할 수 있습니다.</p>
        </div>
      </div>
      {sessions.length ? (
        <div className="history-list">
          {[...sessions]
            .sort((a, b) => b.updatedAt - a.updatedAt)
            .map((s) => (
              <article className="history-card" key={s.id}>
                <button onClick={() => onOpen(s.id)}>
                  <MessageCircle size={19} />
                  <span>
                    <strong>{s.title}</strong>
                    <small>
                      {new Date(s.updatedAt).toLocaleDateString("ko-KR")} ·
                      메시지 {s.messages.length}개
                    </small>
                  </span>
                  <ArrowUpRight size={17} />
                </button>
                <button
                  className="delete-chat"
                  onClick={() => {
                    if (confirm("이 대화를 삭제할까요?"))
                      dispatch(deleteSession(s.id));
                  }}
                  aria-label="대화 삭제"
                >
                  <Trash2 size={17} />
                </button>
              </article>
            ))}
        </div>
      ) : (
        <div className="empty-results big">
          <History size={28} />
          <strong>대화가 아직 없어요.</strong>
          <p>AI에게 새로운 미식 질문을 남겨보세요.</p>
          <button className="solid-button" onClick={onNew}>
            새 대화
          </button>
        </div>
      )}
    </main>
  );
}

"use client";

import { useCallback, useEffect, useRef } from "react";

import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { postChat } from "@/lib/api";
import {
  addMessage,
  applyResponse,
  newSession,
  selectSession,
  setError,
  setInputText,
  setLoading,
} from "@/store/chatSlice";

export function useChatController() {
  const dispatch = useAppDispatch();
  const { sessions, activeSessionId, selectedDistrict, isLoading, inputText } =
    useAppSelector((state) => state.chat);
  const activeSession = sessions.find((s) => s.id === activeSessionId);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    dispatch(setLoading(false));
  }, [dispatch]);

  const send = useCallback(
    async (raw: string, retry = false) => {
      const query = raw.trim();
      if (
        !query ||
        query.length > 2000 ||
        isLoading ||
        !activeSessionId ||
        !activeSession
      )
        return;
      cancel();
      const existing = activeSession.messages;
      const lastUser = existing.at(-1);
      const history =
        retry && lastUser?.sender === "user" ? existing.slice(0, -1) : existing;
      if (!retry) {
        dispatch(
          addMessage({
            sessionId: activeSessionId,
            message: {
              id: crypto.randomUUID(),
              sender: "user",
              text: query,
              createdAt: Date.now(),
            },
          }),
        );
      }
      dispatch(setInputText(""));
      dispatch(setError(null));
      dispatch(setLoading(true));
      const controller = new AbortController();
      abortRef.current = controller;
      const timeout = window.setTimeout(() => controller.abort(), 35000);
      try {
        const response = await postChat(
          query,
          selectedDistrict,
          history,
          controller.signal,
        );
        if (abortRef.current !== controller || controller.signal.aborted)
          return;
        dispatch(applyResponse({ sessionId: activeSessionId, response }));
      } catch (error) {
        if (abortRef.current !== controller) return;
        if (controller.signal.aborted) {
          dispatch(
            setError(
              "응답 시간이 초과되었거나 요청이 취소되었습니다. 다시 시도해 주세요.",
            ),
          );
        } else {
          dispatch(
            setError(
              error instanceof Error
                ? error.message
                : "요청을 완료하지 못했습니다.",
            ),
          );
        }
      } finally {
        window.clearTimeout(timeout);
        if (abortRef.current === controller) {
          abortRef.current = null;
          dispatch(setLoading(false));
        }
      }
    },
    [
      activeSession,
      activeSessionId,
      cancel,
      dispatch,
      isLoading,
      selectedDistrict,
    ],
  );

  const sendCurrent = useCallback(
    () => void send(inputText),
    [inputText, send],
  );
  const retryLast = useCallback(() => {
    const last = activeSession?.messages.at(-1);
    if (last?.sender === "user") void send(last.text, true);
  }, [activeSession, send]);

  const startNew = useCallback(() => {
    cancel();
    dispatch(newSession());
  }, [cancel, dispatch]);
  const openSession = useCallback(
    (id: string) => {
      cancel();
      dispatch(selectSession(id));
    },
    [cancel, dispatch],
  );

  return {
    send,
    sendCurrent,
    retryLast,
    startNew,
    openSession,
    cancel,
    activeSession,
  };
}

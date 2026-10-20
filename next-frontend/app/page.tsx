"use client";

import { unique } from "next/dist/build/utils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useDispatch, useSelector } from "react-redux";

import chatReducer, {
  addMessage,
  setInputText,
  setIsLoading,
  setPlaces,
  setShowMap,
} from "@/store/chatSlice";
import { AppDispatch, RootState } from "@/store/store";
//무조건 시간 관련은 Temporal
import { Temporal } from "@js-temporal/polyfill";
import { configureStore } from "@reduxjs/toolkit";

export default function Chat() {
  const dispatch = useDispatch<AppDispatch>();

  const { message, inputText, isLoading, showMap, place } = useSelector(
    (state: RootState) => state.chat,
  );

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [message]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim()) return;

    const userQuery = inputText;
    const userMsgId = Temporal.Now.instant().epochMilliseconds;
    const newUserMessage = {
      //id: Date.now(),
      id: userMsgId,
      text: userQuery,
      sender: "user" as const,
    };
    dispatch(addMessage(newUserMessage));
    dispatch(setInputText(""));
    dispatch(setIsLoading(true));

    const lowerQuery = userQuery.toLowerCase();
    const isLocationQuery =
      lowerQuery.includes("맛집") ||
      lowerQuery.includes("학원") ||
      lowerQuery.includes("식당") ||
      lowerQuery.includes("카페") ||
      lowerQuery.includes("추천") ||
      lowerQuery.includes("극장") ||
      lowerQuery.includes("근처");

    dispatch(setShowMap(isLocationQuery));

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: userQuery }),
      });
      if (!response.ok) {
        throw new Error("서버 에러가 발생했습니다");
      }
      const data = await response.json();
      const aiMsgId = Temporal.Now.instant().epochMilliseconds;
      dispatch(
        addMessage({
          id: aiMsgId,
          text: data.reply,
          sender: "ai",
        }),
      );
      if (typeof data.show_map === "boolean") {
        dispatch(setShowMap(data.show_map || isLocationQuery));
      }
      if (Array.isArray(data.places)) {
        dispatch(setPlaces(data.places));
      }
    } catch (error) {
      console.error("통신 에러", error);
      const errorMsgId = Temporal.Now.instant().epochMilliseconds;
      dispatch(
        addMessage({
          id: errorMsgId,
          text: "백앤드 서버에 연결할 수 없습니다(파이썬 서버(8000)켜져 있는지 확인 바랍니다.",
          sender: "ai",
        }),
      );
    } finally {
      dispatch(setIsLoading(false));
    }
  }, [inputText, dispatch]);

  const handleKeypress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isLoading) {
      handleSend();
    }
  };
  return (
    <>
      <div className="flex justify-content-center items-center min-h-screen bg-slate-100 p-0 sm:p-4">
        <div
          className={`w-full h-screen sm:h-[88vh] bg-white shadow-2xl rounded-none sm:rounded-2xl flex flex-col overflow-hidden border border-slate-200 transition-all duration-300 ${showMap ? "max-w-[1200px]" : "max-w-[800px]"}`}
        >
          <header className="flex justify-between items-center px-6 py-4 bg-indigo-600 text-white shadow-md shrink-0">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">🤖</span>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                노원구 맛집 & 학원 and so on
              </h1>
              <div className="text-xs bg-indigo-700 px-3 py-1.5 rounded-full font-medium shadow-inner">
                {showMap ? "지도 모드 활성화됨" : "일반 채팅 모드"}
              </div>
            </div>
          </header>
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden bg-slate-50">
            {/* 1) 채팅 영역 (항상 표시됨) */}
            <div
              className={`flex-1 flex flex-col h-full overflow-hidden ${showMap ? "sm:w-1/2 border-r border-slate-200" : "w-full"}`}
            >
              {/* 대화 내용 스크롤 박스 */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {message.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end space-x-2 ${
                      msg.sender === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {/* AI 프로필 아바타 */}
                    {msg.sender === "ai" && (
                      <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                        <span className="text-indigo-600 text-sm font-bold">
                          AI
                        </span>
                      </div>
                    )}

                    {/* 메시지 말풍선 (마크다운 렌더링 지원) */}
                    <div
                      className={`max-w-[80%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm sm:text-base leading-relaxed shadow-sm ${
                        msg.sender === "user"
                          ? "bg-indigo-600 text-white rounded-br-none"
                          : "bg-white text-slate-800 border border-slate-200 rounded-bl-none"
                      }`}
                    >
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{msg.text}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                ))}

                {/* AI가 응답을 생성하는 동안 보여주는 로딩 애니메이션 */}
                {isLoading && (
                  <div className="flex items-end space-x-2 justify-start">
                    <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                      <span className="text-indigo-600 text-sm font-bold">
                        AI
                      </span>
                    </div>
                    <div className="bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none shadow-sm flex items-center space-x-2">
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2.5 h-2.5 bg-indigo-600 rounded-full animate-bounce"></div>
                      <span className="text-xs text-slate-500 ml-1 font-medium">
                        생각하는 중...
                      </span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* 하단 메시지 입력 폼 */}
              <div className="p-4 bg-white border-t border-slate-200 flex items-center space-x-3 shrink-0">
                <input
                  type="text"
                  className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition"
                  placeholder="예: 노원구 맛집 추천해줘 / 파이썬 학원 알려줘..."
                  value={inputText}
                  onChange={(e) => dispatch(setInputText(e.target.value))}
                  onKeyPress={handleKeypress}
                />
                <button
                  onClick={handleSend}
                  disabled={isLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white px-5 py-3 rounded-xl text-sm font-semibold transition shadow-sm shrink-0 cursor-pointer"
                >
                  전송
                </button>
              </div>
            </div>

            {/* 2) 다음맵(카카오맵) 연동 영역 (맛집/학원 등 장소 검색 질문일 때만 화면에 나타남) */}
            {showMap && (
              <div className="w-full sm:w-1/2 h-80 sm:h-full bg-slate-100 relative flex flex-col p-6 border-t sm:border-t-0 sm:border-l border-slate-200 overflow-y-auto">
                {/* 상단 지도 헤더 및 닫기 버튼 */}
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">🗺️</span>
                    <h3 className="text-base font-bold text-slate-800">
                      다음맵(카카오맵) 장소 마커 목록
                    </h3>
                  </div>
                  <button
                    onClick={() => dispatch(setShowMap(false))}
                    className="bg-slate-700 hover:bg-slate-800 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition shadow cursor-pointer"
                  >
                    지도 닫기
                  </button>
                </div>
                <div className="flex space-x-4 mb-4 p-3 bg-white rounded-xl border border-slate-200 text-xs text-slate-600 shadow-sm">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base">🔵</span>
                    <span className="font-semibold text-blue-700">
                      다음맵 등록 업체 (공식 핀)
                    </span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-base"></span>
                    <span className="font-semibold text-orange-600">
                      미등록/AI 추천 업체 (커스텀 아이콘)
                    </span>
                  </div>
                </div>

                <div className="flex-1 space-y-3">
                  {place.length > 0 ? (
                    place.map((item, index) => (
                      <div
                        key={index}
                        className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition flex items-start space-x-3 text-left"
                      >
                        {/* 등록 상태 아이콘 */}
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 text-lg shadow-sm ${
                            item.is_registered
                              ? "bg-blue-100 text-blue-600 border border-blue-300"
                              : "bg-orange-100 text-orange-600 border border-orange-300"
                          }`}
                        >
                          {item.is_registered ? "🔵" : "🟠"}
                        </div>

                        {/* 장소 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-bold text-slate-800 text-sm">
                              {item.name}
                            </h4>

                            <span
                              className={`text-[11px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${
                                item.is_registered
                                  ? "bg-blue-50 text-blue-600"
                                  : "bg-orange-50 text-orange-600"
                              }`}
                            >
                              {item.is_registered
                                ? "다음맵 공식 등록"
                                : "미등록 커스텀"}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 mt-1">
                            📍 {item.address} ({item.category})
                          </p>

                          <p className="text-xs text-slate-700 mt-1.5 bg-slate-50 p-2 rounded-lg">
                            {item.description}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 py-10">
                      <div className="text-4xl mb-2">📍</div>
                      <p className="text-sm">
                        AI가 장소 좌표를 분석 중이거나 표시할 장소가 없습니다.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

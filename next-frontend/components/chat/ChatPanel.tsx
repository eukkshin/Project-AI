"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { ArrowRight, Bot, Check, Coffee, Wine, Map, MapPin, MessageSquare, RotateCcw, Sparkles, Utensils, Heart, Copy, Square } from "lucide-react";
import type { ChatSession, PlaceInfo } from "@/lib/types";
import { placeKey } from "@/lib/types";
import ChatComposer from "@/components/chat/ChatComposer";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { choosePlace, setInputText, setMobileView } from "@/store/chatSlice";
import PlaceCard from "@/components/places/PlaceCard";

const shortcuts = [
  { label: "데이트", prompt: "조용한 데이트 식당 추천해줘", Icon: Heart },
  { label: "파인다이닝", prompt: "특별한 날 갈 만한 코스 요리 식당 찾아줘", Icon: Wine },
  { label: "카페", prompt: "분위기 좋은 카페 찾아줘", Icon: Coffee },
  { label: "혼밥", prompt: "혼자 편하게 식사할 만한 음식점 찾아줘", Icon: Utensils },
];

interface Props {
  session?: ChatSession;
  send: (query: string) => void;
  retry: () => void;
  onCancel: () => void;
}

export default function ChatPanel({ session, send, retry, onCancel }: Props) {
  const dispatch = useAppDispatch();
  const { inputText, isLoading, error, selectedDistrict, favorites, selectedPlaceKey } = useAppSelector((state) => state.chat);
  const messagesEnd = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  async function copyText(id: string, value: string) {
    try { await navigator.clipboard.writeText(value); setCopiedId(id); } catch { setCopiedId(null); }
  }
  const hasMessages = (session?.messages.length ?? 0) > 0;
  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [session?.messages.length, isLoading, error]);

  return <main className="chat-panel" aria-label="AI 채팅">
    <div className="chat-scroll" aria-live="polite">
      {!hasMessages && <div className="welcome">
        <div className="welcome-icon"><Sparkles size={24}/></div>
        <span className="eyebrow">PERSONAL DINING CONCIERGE</span>
        <h1>오늘은 무엇을 맛볼까요?</h1>
        <p><strong>{selectedDistrict}</strong>에서 만나는 식당과 카페.<br className="desktop-break"/> 취향에 맞는 미식 경험을 찾아드려요.</p>
        <div className="shortcut-grid" aria-label="빠른 질문">
          {shortcuts.map(({ label, prompt, Icon }) => <button key={label} type="button" onClick={() => send(prompt)} disabled={isLoading}><Icon size={18}/>{label}<ArrowRight size={14}/></button>)}
        </div>
        <div className="welcome-card"><MapPin size={16}/><span>현재 탐색 지역 <strong>{selectedDistrict}</strong></span><span className="welcome-card-note">상단에서 변경 가능</span></div>
      </div>}
      {hasMessages && <div className="conversation">
        <div className="conversation-label"><span className="status-dot"/> DINOVO 컨시어지와 대화 중</div>
        {session?.messages.map((msg) => <div key={msg.id} className={`message-row ${msg.sender === "user" ? "mine" : "theirs"}`}>
          {msg.sender === "assistant" && <div className="avatar"><Bot size={18}/></div>}
          <div className="message-body"><div className={`bubble ${msg.sender === "user" ? "user-bubble" : "ai-bubble"}`}>
            {msg.sender === "assistant" ? <ReactMarkdown skipHtml components={{ a: ({href,children}) => {
              const valid = typeof href === "string" && /^https?:\/\//i.test(href);
              return valid ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
            } }}>{msg.text}</ReactMarkdown> : <p>{msg.text}</p>}
          </div><div className="message-meta"><time>{new Date(msg.createdAt).toLocaleTimeString("ko-KR", {hour:"numeric",minute:"2-digit"})}</time>{msg.sender === "assistant" && <button className="message-copy" type="button" aria-label="AI 답변 복사" title="답변 복사" onClick={() => void copyText(msg.id, msg.text)}>{copiedId === msg.id ? <Check size={14}/> : <Copy size={14}/>}<span>{copiedId === msg.id ? "복사됨" : "복사"}</span></button>}</div></div>
        </div>)}
        {Boolean(session?.places.length) && <div className="chat-results">
          <div className="results-head"><div><span className="eyebrow">FOUND FOR YOU</span><h2>검색된 장소 <span>{session?.places.length}곳</span></h2></div><button onClick={() => dispatch(setMobileView("map"))} className="text-link mobile-map-link"><Map size={16}/> 지도 보기</button></div>
          <div className="place-cards">{session?.places.map((place: PlaceInfo) => <PlaceCard key={placeKey(place)} place={place} compact={false} selected={placeKey(place) === selectedPlaceKey} bookmarked={favorites.some((p) => p.name === place.name)} onSelect={() => { dispatch(choosePlace(placeKey(place))); dispatch(setMobileView("map")); }}/>)}</div>
          <p className="disclaimer">장소는 검색 API 결과입니다. 실제 영업 여부와 상세 정보는 업체에 확인해 주세요.</p>
        </div>}
        {Boolean(session?.suggestedQuestions.length) && <div className="follow-up-chips">{session?.suggestedQuestions.map((q) => <button key={q} onClick={() => send(q)} disabled={isLoading}>{q} <ArrowRight size={13}/></button>)}</div>}
      </div>}
      {isLoading && <div className="message-row theirs loading-row"><div className="avatar"><Bot size={18}/></div><div className="ai-bubble bubble thinking"><span className="thinking-dots"><i/><i/><i/></span> 질문을 분석하고 있어요 <button type="button" className="cancel-chat" onClick={onCancel}><Square size={12}/> 중지</button></div></div>}
      {error && <div className="chat-error" role="alert"><MessageSquare size={17}/><span>{error}</span><button type="button" onClick={retry}><RotateCcw size={15}/> 다시 시도</button></div>}
      <div ref={messagesEnd}/>
    </div>
    <ChatComposer value={inputText} district={selectedDistrict} disabled={isLoading} onChange={(value) => dispatch(setInputText(value))} onSend={() => send(inputText)}/>
  </main>;
}

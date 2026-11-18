"use client";

import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Coffee,
  Compass,
  Heart,
  MapPinned,
  Search,
  Sparkles,
  UtensilsCrossed,
  Wine,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import type { LucideIcon } from "lucide-react";

type HomeViewProps = {
  onPrompt: (query: string) => void;
  onExplore: () => void;
};

const PROMPTS: { title: string; detail: string; prompt: string; Icon: LucideIcon }[] = [
  { title: "기념일 & 데이트", detail: "특별한 날의 한 끼", prompt: "조용한 데이트 식당 추천해줘", Icon: Heart },
  { title: "미식 탐험", detail: "새로운 한 접시의 발견", prompt: "평소와 다른 특별한 음식을 먹고 싶어. 식당 찾아줘", Icon: Wine },
  { title: "혼자서도 좋게", detail: "혼밥하기 편안한 곳", prompt: "혼자서 편하게 식사할 수 있는 식당 찾아줘", Icon: UtensilsCrossed },
  { title: "커피와 휴식", detail: "여유를 즐기는 공간", prompt: "조용한 카페를 찾아줘", Icon: Coffee },
];

const QUICK_PROMPTS = [
  { label: "기념일 레스토랑", prompt: "기념일에 가기 좋은 레스토랑 추천해줘" },
  { label: "조용한 데이트", prompt: "조용한 데이트 식당 추천해줘" },
  { label: "분위기 좋은 와인바", prompt: "분위기 좋은 와인바 추천해줘" },
  { label: "내 주변 맛집", prompt: "내 주변 맛집을 추천해줘" },
];

export default function HomeView({ onPrompt, onExplore }: HomeViewProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = query.trim();
    if (value) onPrompt(value);
  };

  return (
    <main className="content-view home-view">
      <section className="home-hero" aria-labelledby="hero-title">
        <div className="hero-inner">
          <span className="hero-kicker">DINOVO <span aria-hidden="true">/</span> YOUR DINING CONCIERGE</span>
          <h1 id="hero-title">당신의 취향을 발견하는<br /><span>새로운 미식의 시작.</span></h1>
          <p className="hero-description">
            오늘의 기분부터 특별한 순간까지.<br />
            AI가 당신에게 어울리는 식당을 찾아드립니다.
          </p>

          <form className="hero-search" onSubmit={handleSearch} role="search">
            <Search size={21} strokeWidth={1.8} aria-hidden="true" />
            <label htmlFor="hero-dining-search" className="sr-only">AI에게 식당 추천 요청하기</label>
            <input
              id="hero-dining-search"
              type="search"
              autoComplete="off"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              maxLength={1500}
              placeholder="오늘은 어떤 식사를 하고 싶으세요?"
            />
            <button type="submit" disabled={!query.trim()} aria-label="AI 컨시어지에서 검색 이어가기">
              <span>AI에게 물어보기</span><ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
            </button>
          </form>

          <div className="hero-examples" aria-label="추천 질문">
            <span className="hero-examples-caption">어디부터 시작할까요?</span>
            <div className="hero-example-chips">
              {QUICK_PROMPTS.map(({ label, prompt }) => (
                <button key={label} type="button" onClick={() => onPrompt(prompt)}>{label}</button>
              ))}
            </div>
          </div>
          <a className="hero-scroll-hint" href="#discover">
            <span>DISCOVER MORE</span><ArrowDown size={16} strokeWidth={1.7} aria-hidden="true" />
          </a>
        </div>
      </section>

      <section id="discover" className="home-section" aria-labelledby="mood-heading">
        <div className="section-heading">
          <div><span className="eyebrow">EXPLORE BY MOOD</span><h2 id="mood-heading">어떤 식사로 기억하고 싶으세요?</h2></div>
          <button className="text-link" type="button" onClick={onExplore}>직접 탐색하기 <ArrowUpRight size={16} aria-hidden="true" /></button>
        </div>
        <div className="mood-grid">
          {PROMPTS.map(({ title, detail, prompt, Icon }, index) => (
            <button key={title} className={`mood-card mood-${index}`} type="button" onClick={() => onPrompt(prompt)}>
              <span className="mood-icon"><Icon size={24} strokeWidth={1.6} aria-hidden="true" /></span>
              <span><strong>{title}</strong><small>{detail}</small></span>
              <ArrowUpRight size={18} aria-hidden="true" />
            </button>
          ))}
        </div>
      </section>

      <section className="home-section editorial-row" aria-labelledby="editorial-heading">
        <div><span className="eyebrow">LESS SCROLLING, MORE DISCOVERING</span><h2 id="editorial-heading">검색을 넘어, 선택까지.</h2><p>AI에게 질문하고, 실제 장소 검색 결과를 지도에서 확인하세요. 예약·웨이팅은 확인된 공식 연결로만 안내합니다.</p></div>
        <div className="editorial-steps">
          <div><Sparkles size={20} aria-hidden="true" /><strong>01. 취향 말하기</strong><span>음식·예산·동행인을 자연어로</span></div>
          <div><MapPinned size={20} aria-hidden="true" /><strong>02. 실제 식당 발견</strong><span>지도와 출처 정보를 한눈에</span></div>
          <div><CalendarDays size={20} aria-hidden="true" /><strong>03. 방문 계획하기</strong><span>상세 페이지에서 예약 연결 확인</span></div>
        </div>
      </section>
      <div className="home-footer-note"><Compass size={14} aria-hidden="true" /> 검색 결과에 없는 가격·별점·영업정보는 확인된 사실처럼 표시하지 않습니다.</div>
    </main>
  );
}

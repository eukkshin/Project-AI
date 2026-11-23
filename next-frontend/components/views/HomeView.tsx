"use client";
import { ArrowRight, ArrowUpRight, CalendarDays, Heart, MapPin, Sparkles, UtensilsCrossed, Search, MessageCircle, ShieldCheck } from "lucide-react";
import { useState,type FormEvent } from "react";

type Props={onPrompt:(text:string)=>void;onExplore:()=>void};
const IDEAS=[
 {label:"기념일",query:"기념일에 조용하고 분위기 좋은 레스토랑 추천해줘"},
 {label:"데이트",query:"데이트하기 좋은 레스토랑 찾아줘"},
 {label:"혼자만의 식사",query:"혼자 편하게 식사할 수 있는 조용한 식당 추천해줘"},
 {label:"특별한 코스",query:"특별한 날에 어울리는 코스 요리 레스토랑 추천해줘"},
];
const MOODS=[
 {image:"/group/three/3/editorial/table-atmosphere.webp",title:"조용한 둘만의 시간",eyebrow:"FOR TWO",query:"데이트에 어울리는 조용하고 분위기 좋은 레스토랑 추천해줘"},
 {image:"/group/three/3/editorial/plating-detail.webp",title:"특별한 한 끼를 위한 코스",eyebrow:"FINE DINING",query:"기념일을 위한 파인다이닝 레스토랑 추천해줘"},
 {image:"/group/three/3/editorial/quiet-moment.webp",title:"하루를 마무리하는 공간",eyebrow:"SLOW MOMENT",query:"편안하고 여유롭게 저녁을 먹을 수 있는 식당 추천해줘"},
];
export default function HomeView({onPrompt,onExplore}:Props){
 const [query,setQuery]=useState("");
 function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(query.trim())onPrompt(query.trim());}
 return <main className="d-home">
   <section className="d-hero" aria-labelledby="d-hero-heading">
    <div className="d-hero-shade"/>
    <div className="d-hero-copy">
      <span className="d-overline">AI DINING CONCIERGE</span>
      <h1 id="d-hero-heading">당신의 오늘을<br/>더 특별하게 만드는<br/><em>AI 다이닝 컨시어지</em></h1>
      <p>맛, 분위기, 목적까지 이해하는 다이닝 가이드.<br/>DINOVO가 취향에 맞는 식당을 찾아드립니다.</p>
      <form className="d-hero-search" onSubmit={submit} role="search">
        <Sparkles size={19}/><label className="sr-only" htmlFor="d-dining-query">AI 컨시어지에 질문하기</label>
        <input id="d-dining-query" autoComplete="off" maxLength={1500} value={query} onChange={e=>setQuery(e.target.value)} placeholder="오늘은 어떤 식사를 계획하고 계신가요?" />
        <button type="submit" disabled={!query.trim()} aria-label="AI에게 질문 전송"><ArrowRight size={20}/></button>
      </form>
      <div className="d-hero-prompts" aria-label="추천 질문">{IDEAS.map((item)=><button key={item.label} onClick={()=>onPrompt(item.query)}>{item.label} <ArrowUpRight size={12}/></button>)}</div>
      <div className="d-hero-paths"><button type="button" onClick={()=>onPrompt("내 상황에 맞는 레스토랑 추천해줘")}><MessageCircle size={18}/><span><strong>AI와 함께 찾기</strong><small>취향과 상황을 이야기해요</small></span><ArrowUpRight size={16}/></button><button type="button" onClick={onExplore}><Search size={18}/><span><strong>직접 식당 탐색</strong><small>검색 결과와 지도로 비교해요</small></span><ArrowUpRight size={16}/></button></div>
    </div>
    <span className="d-hero-photo-credit">DINOVO EDITORIAL · AI-GENERATED IMAGERY</span>
   </section>
   <section className="d-discover" aria-labelledby="d-discover-title">
     <div className="d-section-heading"><div><span className="d-overline">DINING CURATION</span><h2 id="d-discover-title">DINOVO 큐레이션</h2><p>원하는 분위기에서 시작해 실제 식당을 탐색해 보세요.</p></div><button onClick={onExplore} className="d-view-more">직접 식당 탐색하기 <ArrowUpRight size={17}/></button></div>
     <div className="d-curation-grid">{MOODS.map((card)=><button key={card.title} className="d-curation-card" type="button" onClick={()=>onPrompt(card.query)}>
       <span className="d-curation-image" style={{backgroundImage:`url('${card.image}')`}}/><span className="d-curation-info"><small>{card.eyebrow}</small><strong>{card.title}</strong><span>AI 추천 시작 <ArrowUpRight size={16}/></span></span>
     </button>)}</div>
   </section>
   <section className="d-method"><div><span className="d-overline">HOW IT WORKS</span><h2>질문에서 방문 계획까지.</h2></div><div className="d-method-steps"><span><Sparkles size={20}/><b>01. 취향 이야기</b><small>자연어로 간편하게</small></span><span><UtensilsCrossed size={20}/><b>02. 식당 비교</b><small>실제 장소 정보 기반</small></span><span><MapPin size={20}/><b>03. 방문 준비</b><small>지도·공식 예약 연결</small></span><span><CalendarDays size={20}/><b>04. 예약 관리</b><small>승인이 필요한 경우 알림</small></span></div></section>
   <div className="d-trust-bar"><ShieldCheck size={16}/><p>추천은 실제 장소 검색을 기반으로 안내합니다. 현재 외부 식당의 예약 가능 여부와 결제는 자동 확정되지 않습니다.</p></div>
 </main>;
}

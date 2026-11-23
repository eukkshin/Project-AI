"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, LocateFixed, MapPin, Search, Scale, SlidersHorizontal, X } from "lucide-react";
import type { PlaceInfo } from "@/lib/types";
import { mapPlaceUrl, placeKey } from "@/lib/types";
import { searchRestaurants } from "@/lib/api";
import KakaoMap from "@/components/map/KakaoMap";
import PlaceCard from "@/components/places/PlaceCard";
import { useAppSelector } from "@/hooks/redux";

export default function ExploreView() {
  const district = useAppSelector(s=>s.chat.selectedDistrict);
  const favorites = useAppSelector(s=>s.chat.favorites);
  const [term,setTerm]=useState("");
  const [category,setCategory]=useState("restaurant");
  const [places,setPlaces]=useState<PlaceInfo[]>([]);
  const [selected,setSelected]=useState<string|null>(null);
  const [compare,setCompare]=useState<string[]>([]);
  const [coords,setCoords]=useState<{lat:number;lng:number}|null>(null);
  const [radius,setRadius]=useState(3000);
  const [loading,setLoading]=useState(false);
  const [searched,setSearched]=useState(false);
  const [error,setError]=useState("");
  const request=useRef<AbortController|null>(null);
  const mapSectionRef = useRef<HTMLElement | null>(null);
  useEffect(()=>{const q=new URLSearchParams(window.location.search).get("q");if(q)setTerm(q.slice(0,80));return ()=>request.current?.abort();},[]);
  async function search(e?:React.FormEvent){e?.preventDefault();if(!term.trim())return;
    request.current?.abort();const controller=new AbortController();request.current=controller;
    setLoading(true);setError("");setCompared([]);setSearched(false);
    try { const result=await searchRestaurants({query:term.trim(),district:coords?"":district,category,lat:coords?.lat,lng:coords?.lng,radius,sort:coords?"distance":"accuracy"},controller.signal);
      if(controller.signal.aborted)return;setPlaces(result.places);setSelected(result.places[0]?placeKey(result.places[0]):null);setSearched(true);
    }catch(err){if(!controller.signal.aborted)setError(err instanceof Error?err.message:"검색에 실패했습니다.");}
    finally{if(request.current===controller)setLoading(false);}
  }
  function setCompared(keys:string[]){setCompare(keys)}
  function requestLocation(){if(!navigator.geolocation){setError("이 브라우저에서는 위치 기능을 지원하지 않습니다.");return;}
    navigator.geolocation.getCurrentPosition(({coords:c})=>{setCoords({lat:c.latitude,lng:c.longitude});setError("");},()=>setError("현재 위치를 가져올 수 없습니다. 브라우저 위치 권한을 확인해 주세요."),{timeout:8000,maximumAge:0});
  }
  function selectPlace(key: string) {
    setSelected(key);
    // The map stays sticky on desktop. On small screens the panels stack,
    // so bring the corresponding map into view when a result is selected.
    if (window.matchMedia("(max-width: 740px)").matches) {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      mapSectionRef.current?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    }
  }
  const compared=places.filter(p=>compare.includes(placeKey(p)));
  return <main className="content-view explore-view">
    <div className="page-kicker"><span className="eyebrow">DINOVO DISCOVERY</span><span>실제 장소 검색 · Kakao Local</span></div>
    <div className="page-title-row"><div><h1>좋은 식사는, 발견에서 시작됩니다.</h1><p>음식·분위기를 검색하고 원하는 장소를 지도에서 비교해 보세요.</p></div><button className="outline-button" onClick={requestLocation}><LocateFixed size={16}/> 현재 위치 사용</button></div>
    <form className="explore-search" onSubmit={search}>
      <div className="explore-input"><Search size={19}/><input required maxLength={80} value={term} onChange={e=>setTerm(e.target.value)} placeholder="음식 또는 식당 종류 검색" aria-label="음식점 검색어"/></div>
      <label className="explore-select"><SlidersHorizontal size={16}/><select aria-label="카테고리" value={category} onChange={e=>setCategory(e.target.value)}><option value="restaurant">음식점</option><option value="cafe">카페</option><option value="all">모두</option></select><ChevronDown size={14}/></label>
      {coords&&<label className="explore-select"><select aria-label="검색 반경" value={radius} onChange={e=>setRadius(Number(e.target.value))}><option value={1000}>1km</option><option value={3000}>3km</option><option value={5000}>5km</option><option value={10000}>10km</option></select></label>}
      <button disabled={loading} className="solid-button" type="submit">{loading?"검색 중...":"검색하기"}<ArrowUpRight size={16}/></button>
    </form>
    <div className="d-explore-suggestions" aria-label="추천 검색어"><span>빠른 탐색</span>{["파스타", "오마카세", "파인다이닝", "와인바", "브런치"].map((t)=><button type="button" key={t} onClick={()=>setTerm(t)} className={term===t?"selected":""}>{t}</button>)}</div>
    <div className="filter-explanation"><MapPin size={14}/>{coords?"내 현재 위치 기준 · 거리에 따라 결과가 정렬됩니다.":`${district} 기준 키워드 검색 · 실제 거리는 표시하지 않습니다.`}{coords&&<button onClick={()=>setCoords(null)}>위치 기준 해제 <X size={13}/></button>}</div>
    {error&&<div className="error-surface" role="alert">{error}</div>}
    <div className="explore-columns"><section className="explore-list-col"><div className="list-heading"><strong>검색 결과 {searched?`${places.length}곳`:""}</strong><span>가격·평점·영업상태는 별도 확인</span></div>
      {places.length>0?<div className="explore-place-list">{places.map(p=><div key={placeKey(p)} className="explore-card-wrap"><PlaceCard place={p} selected={selected===placeKey(p)} bookmarked={favorites.some(f=>f.name===p.name)} onSelect={()=>selectPlace(placeKey(p))}/><label className="compare-check"><input type="checkbox" checked={compare.includes(placeKey(p))} disabled={!compare.includes(placeKey(p)) && compare.length>=3} onChange={e=>setCompare(prev=>e.target.checked?(prev.length>=3?prev:[...prev,placeKey(p)]):prev.filter(k=>k!==placeKey(p)))}/><span>비교에 담기</span></label></div>)}</div>:
      <div className="empty-results"><Search size={27}/><strong>{searched?"검색된 식당이 없습니다":loading?"식당 정보를 찾고 있습니다":"어떤 식당이 궁금하세요?"}</strong><p>{searched?"음식 종류나 범위를 바꿔 다시 검색해 보세요.":"실제 장소 데이터가 있을 때만 결과를 표시합니다."}</p></div>}
    </section><aside ref={mapSectionRef} className="explore-map-col" aria-label="식당 지도"><div className="list-heading"><strong>위치 보기</strong><span>{places.length}개 마커</span></div>
      <div className="explore-map-frame">{places.length>0?<KakaoMap places={places} selectedKey={selected} onSelect={setSelected} active/>:<div className="map-placeholder"><MapPin size={28}/><p>검색하면 지도를 표시합니다.</p></div>}</div>
      {places.length>0&&<p className="map-source-note">검색 결과: Kakao Local API · 지도에 표시된 장소의 예약/영업 여부는 확인 필요</p>}
    </aside></div>
    {compared.length>0&&<section className="compare-panel"><div className="section-heading"><div><span className="eyebrow">COMPARE</span><h2><Scale size={19}/> 식당 비교 ({compared.length}/3)</h2></div><button onClick={()=>setCompare([])} className="text-link">초기화</button></div><div className="compare-grid">{compared.map(p=><article key={placeKey(p)}><strong>{p.name}</strong><span>{p.category}</span><p>{p.address}</p><small>가격·예약 가능 여부: 미확인</small><a href={mapPlaceUrl(p)} target="_blank" rel="noopener noreferrer">카카오 상세 확인 <ArrowUpRight size={14}/></a></article>)}</div></section>}
  </main>;
}

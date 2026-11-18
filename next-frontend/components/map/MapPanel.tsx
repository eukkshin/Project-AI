"use client";

import {
  Bookmark,
  Compass,
  ExternalLink,
  Map as MapIcon,
  MapPin,
  Sparkles,
} from "lucide-react";

import KakaoMap from "@/components/map/KakaoMap";
import PlaceCard from "@/components/places/PlaceCard";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { mapPlaceUrl, placeKey } from "@/lib/types";
import { choosePlace, setMobileView } from "@/store/chatSlice";

import type { ChatSession } from "@/lib/types";
export default function MapPanel({ session }: { session?: ChatSession }) {
  const dispatch = useAppDispatch();
  const { selectedPlaceKey, mobileView, favorites, selectedDistrict } =
    useAppSelector((s) => s.chat);
  const places = session?.showMap ? session.places : [];
  const selected = places.find((p) => placeKey(p) === selectedPlaceKey);
  return (
    <aside
      className={`map-panel ${mobileView === "map" ? "mobile-map-visible" : ""}`}
      aria-label="추천 장소 지도와 목록"
    >
      <div className="map-panel-header">
        <div className="section-title">
          <MapPin size={18} />
          <h2>추천 장소</h2>
        </div>
        <span className="region-pill">{selectedDistrict}</span>
      </div>
      {places.length ? (
        <>
          <div className="map-frame">
            <KakaoMap
              places={places}
              selectedKey={selectedPlaceKey}
              onSelect={(key) => dispatch(choosePlace(key))}
              active={mobileView === "map"}
            />
          </div>
          <div className="map-list-header">
            <h3>
              검색 결과 <span>{places.length}곳</span>
            </h3>
            <span>카카오 장소 검색 결과</span>
          </div>
          <div className="map-list">
            {places.map((p) => (
              <div key={placeKey(p)}>
                <PlaceCard
                  place={p}
                  compact
                  selected={placeKey(p) === selectedPlaceKey}
                  bookmarked={favorites.some((f) => f.name === p.name)}
                  onSelect={() => dispatch(choosePlace(placeKey(p)))}
                />
              </div>
            ))}
          </div>
          {selected && (
            <div className="map-selected-footer">
              <span>
                <MapPin size={14} /> {selected.name}
              </span>
              <a
                href={mapPlaceUrl(selected)}
                target="_blank"
                rel="noopener noreferrer"
              >
                카카오맵 상세 <ExternalLink size={14} />
              </a>
            </div>
          )}
        </>
      ) : (
        <div className="map-empty">
          <div className="map-empty-art">
            <div className="map-empty-circle one" />
            <div className="map-empty-circle two" />
            <div className="map-empty-center">
              <Compass size={30} />
            </div>
          </div>
          <h3>어떤 식당을 찾으세요?</h3>
          <p>
            AI에게 원하는 식사를 물어보면
            <br /> 검색 결과와 실제 지도를 보여드립니다.
          </p>
          <span className="map-empty-label">
            <Sparkles size={14} /> 질문 후 지도가 표시돼요
          </span>
        </div>
      )}
      <button
        className="map-back-chat"
        type="button"
        onClick={() => dispatch(setMobileView("chat"))}
      >
        <MapIcon size={16} /> 대화로 돌아가기
      </button>
    </aside>
  );
}

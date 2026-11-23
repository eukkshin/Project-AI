"use client";

import { ExternalLink, MapPinned } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import {
  KakaoMapInstance,
  KakaoMarkerInstance,
  loadKakaoMaps,
} from "@/lib/kakao-map";
import { mapPlaceUrl, placeKey } from "@/lib/types";

import type { PlaceInfo } from "@/lib/types";
interface Props {
  places: PlaceInfo[];
  selectedKey: string | null;
  onSelect: (key: string) => void;
  active: boolean;
}
const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY ?? "";

export default function KakaoMap({
  places,
  selectedKey,
  onSelect,
  active,
}: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMapInstance | null>(null);
  const markersRef = useRef<
    { key: string; marker: KakaoMarkerInstance; lat: number; lng: number }[]
  >([]);
  const onSelectRef = useRef(onSelect);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    if (!JS_KEY || !divRef.current || !places.length) return;
    let disposed = false;
    void loadKakaoMaps(JS_KEY)
      .then((maps) => {
        if (disposed || !divRef.current) return;
        setError(null);
        const map = new maps.Map(divRef.current, {
          center: new maps.LatLng(places[0].lat, places[0].lng),
          level: 5,
        });
        mapRef.current = map;
        const bounds = new maps.LatLngBounds();
        markersRef.current = places.map((place) => {
          const point = new maps.LatLng(place.lat, place.lng);
          bounds.extend(point);
          const marker = new maps.Marker({ position: point, map });
          maps.event.addListener(marker, "click", () =>
            onSelectRef.current(placeKey(place)),
          );
          return {
            key: placeKey(place),
            marker,
            lat: place.lat,
            lng: place.lng,
          };
        });
        if (places.length > 1) map.setBounds(bounds);
        window.requestAnimationFrame(() => map.relayout());
      })
      .catch((err: unknown) => {
        if (!disposed)
          setError(
            err instanceof Error ? err.message : "지도를 불러오지 못했습니다.",
          );
      });
    return () => {
      disposed = true;
      markersRef.current.forEach((m) => m.marker.setMap(null));
      markersRef.current = [];
      mapRef.current = null;
    };
  }, [places]);

  useEffect(() => {
    if (!JS_KEY || !mapRef.current || !window.kakao?.maps) return;
    const selected = markersRef.current.find((m) => m.key === selectedKey);
    markersRef.current.forEach((m) =>
      m.marker.setZIndex(m.key === selectedKey ? 100 : 1),
    );
    if (selected)
      mapRef.current.panTo(
        new window.kakao.maps.LatLng(selected.lat, selected.lng),
      );
  }, [selectedKey, places]);

  useEffect(() => {
    if (!active || !mapRef.current) return;
    const requestId = window.requestAnimationFrame(() =>
      mapRef.current?.relayout(),
    );
    return () => window.cancelAnimationFrame(requestId);
  }, [active]);

  if (!JS_KEY || error)
    return (
      <div className="map-fallback">
        <div className="map-fallback-icon">
          <MapPinned size={28} />
        </div>
        <strong>
          {error ? "지도를 불러오지 못했습니다" : "지도 연결 준비 중"}
        </strong>
        <p>
          {error ||
            "실제 지도를 표시하려면 .env.local에 카카오 JavaScript 키를 설정해 주세요."}
        </p>
        {places[0] && (
          <a
            target="_blank"
            rel="noopener noreferrer"
            href={mapPlaceUrl(places[0])}
          >
            카카오 지도에서 보기 <ExternalLink size={14} />
          </a>
        )}
      </div>
    );
  return (
    <div
      className="map-canvas"
      ref={divRef}
      role="region"
      aria-label="검색된 장소의 카카오 지도"
    />
  );
}

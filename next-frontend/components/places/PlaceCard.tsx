"use client";

import {
  ArrowUpRight,
  Bookmark,
  CheckCircle2,
  MapPin,
  Phone,
  Store,
} from "lucide-react";

import { useAppDispatch } from "@/hooks/redux";
import { mapPlaceUrl } from "@/lib/types";
import { toggleFavorite } from "@/store/chatSlice";

import type { PlaceInfo } from "@/lib/types";
interface Props {
  place: PlaceInfo;
  compact?: boolean;
  selected?: boolean;
  bookmarked: boolean;
  onSelect?: () => void;
}

export default function PlaceCard({
  place,
  compact = false,
  selected = false,
  bookmarked,
  onSelect,
}: Props) {
  const dispatch = useAppDispatch();
  return (
    <article
      className={`place-card ${compact ? "place-card-compact" : ""} ${selected ? "place-card-selected" : ""}`}
    >
      <div className="place-topline">
        <span className="place-icon">
          <Store size={19} />
        </span>
        <button
          type="button"
          className={`bookmark-button ${bookmarked ? "bookmarked" : ""}`}
          onClick={() => dispatch(toggleFavorite(place))}
          aria-label={
            bookmarked
              ? `${place.name} 즐겨찾기 해제`
              : `${place.name} 즐겨찾기 추가`
          }
          aria-pressed={bookmarked}
        >
          <Bookmark size={18} fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      {onSelect ? (
        <button
          type="button"
          className="place-main"
          onClick={onSelect}
          title={`${place.name} 지도에서 보기`}
        >
          <strong>{place.name}</strong>
          <small>{place.category || "장소"}</small>
          <span className="place-address">
            <MapPin size={13} />
            {place.address}
          </span>
        </button>
      ) : (
        <div className="place-main">
          <strong>{place.name}</strong>
          <small>{place.category || "장소"}</small>
          <span className="place-address">
            <MapPin size={13} />
            {place.address}
          </span>
        </div>
      )}
      {!compact && place.description && (
        <p className="place-description">{place.description}</p>
      )}
      <div className="place-bottom">
        {place.is_registered && (
          <span className="registered-label">
            <CheckCircle2 size={12} /> 자체 등록
          </span>
        )}
        <a
          href={mapPlaceUrl(place)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${place.name} 카카오 지도에서 상세 보기`}
        >
          상세 보기 <ArrowUpRight size={15} />
        </a>
      </div>
      {!compact && place.phone && (
        <a
          className="place-phone"
          href={`tel:${place.phone.replace(/[^\d+]/g, "")}`}
        >
          <Phone size={13} /> {place.phone}
        </a>
      )}
    </article>
  );
}

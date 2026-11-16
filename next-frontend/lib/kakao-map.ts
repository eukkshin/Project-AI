interface KakaoLatLng {}
interface KakaoBounds {
  extend(latLng: KakaoLatLng): void;
}
export interface KakaoMapInstance {
  setBounds(bounds: KakaoBounds): void;
  panTo(latLng: KakaoLatLng): void;
  relayout(): void;
}
export interface KakaoMarkerInstance {
  setMap(map: KakaoMapInstance | null): void;
  setZIndex(z: number): void;
}
export interface KakaoMaps {
  load(callback: () => void): void;
  LatLng: new (lat: number, lng: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  Map: new (
    element: HTMLElement,
    options: { center: KakaoLatLng; level: number },
  ) => KakaoMapInstance;
  Marker: new (options: {
    position: KakaoLatLng;
    map: KakaoMapInstance;
  }) => KakaoMarkerInstance;
  event: {
    addListener(
      marker: KakaoMarkerInstance,
      eventName: string,
      listener: () => void,
    ): void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}
let pending: Promise<KakaoMaps> | null = null;

export function loadKakaoMaps(key: string): Promise<KakaoMaps> {
  if (typeof window === "undefined")
    return Promise.reject(new Error("서버에서는 지도를 표시할 수 없습니다."));
  if (window.kakao?.maps) {
    return new Promise((resolve) =>
      window.kakao!.maps.load(() => resolve(window.kakao!.maps)),
    );
  }
  if (pending) return pending;
  pending = new Promise<KakaoMaps>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.async = true;
    script.onload = () => {
      if (!window.kakao?.maps) {
        reject(new Error("지도 SDK 초기화에 실패했습니다."));
        return;
      }
      window.kakao.maps.load(() => resolve(window.kakao!.maps));
    };
    script.onerror = () =>
      reject(
        new Error(
          "지도 SDK를 불러오지 못했습니다. JavaScript 키와 등록 도메인을 확인해 주세요.",
        ),
      );
    document.head.appendChild(script);
  }).catch((error) => {
    pending = null;
    throw error;
  });
  return pending;
}

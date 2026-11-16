"use client";

import { ArrowUp, CornerDownLeft, LoaderCircle } from "lucide-react";
import { useEffect, useRef } from "react";

interface Props {
  value: string;
  disabled: boolean;
  district: string;
  onChange: (text: string) => void;
  onSend: () => void;
}

export default function ChatComposer({
  value,
  disabled,
  district,
  onChange,
  onSend,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 152)}px`;
  }, [value]);
  return (
    <div className="composer-wrap">
      <div className="composer">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          maxLength={2000}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !e.nativeEvent.isComposing
            ) {
              e.preventDefault();
              if (!disabled) onSend();
            }
          }}
          disabled={disabled}
          aria-label="AI에게 질문하기"
          placeholder={`${district}에서 어떤 장소를 찾으시나요?`}
        />
        <button
          type="button"
          className="send-button"
          onClick={onSend}
          disabled={disabled || !value.trim()}
          aria-label="메시지 전송"
        >
          {disabled ? (
            <LoaderCircle size={19} className="spin" />
          ) : (
            <ArrowUp size={21} />
          )}
        </button>
      </div>
      <div className="composer-note">
        <span>AI 답변과 장소 정보는 실제 방문 전에 확인해 주세요.</span>
        <span>
          <CornerDownLeft size={12} /> Enter 전송 · Shift+Enter 줄바꿈
        </span>
      </div>
    </div>
  );
}

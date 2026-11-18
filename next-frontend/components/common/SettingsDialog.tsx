"use client";

import { useEffect, useState } from "react";
import { Check, Moon, Sun, Monitor, Trash2, X } from "lucide-react";
import { useTheme } from "@/components/common/ThemeProvider";
import { useAppDispatch, useAppSelector } from "@/hooks/redux";
import { clearAllHistory, setSaveHistory } from "@/store/chatSlice";
import type { ThemeChoice } from "@/lib/types";

const options: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { value: "light", label: "라이트", Icon: Sun },
  { value: "dark", label: "다크", Icon: Moon },
  { value: "system", label: "시스템", Icon: Monitor },
];

export default function SettingsDialog({ onClose, onClear }: { onClose: () => void; onClear: () => void }) {
  const dispatch = useAppDispatch();
  const { choice, setChoice } = useTheme();
  const saveHistory = useAppSelector((s) => s.chat.saveHistory);
  const [confirmClear, setConfirmClear] = useState(false);
  useEffect(() => { const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", handle); return () => document.removeEventListener("keydown", handle); }, [onClose]);
  return <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }} role="presentation">
    <section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="modal-header"><div><p className="eyebrow">PERSONALIZATION</p><h2 id="settings-title">환경 설정</h2></div>
        <button className="icon-button" type="button" onClick={onClose} aria-label="설정 닫기"><X size={19}/></button></div>
      <div className="setting-section"><h3>화면 테마</h3><p className="hint">기기에 맞는 화면 스타일을 선택할 수 있습니다.</p>
        <div className="theme-choices" role="group" aria-label="화면 테마">
          {options.map(({value,label,Icon}) => <button key={value} type="button" className={`theme-choice ${choice === value ? "selected" : ""}`} onClick={() => setChoice(value)} aria-pressed={choice === value}>
            <Icon size={18}/>{label}{choice === value && <Check size={15}/>}</button>)}
        </div>
      </div>
      <div className="setting-section"><div className="setting-row"><div><h3>이 기기에 대화 저장</h3><p className="hint">이 브라우저에만 저장됩니다. 서버나 다른 기기와 동기화되지 않습니다.</p></div>
        <label className="switch" aria-label="대화 기록 로컬 저장"><input type="checkbox" checked={saveHistory} onChange={(e) => dispatch(setSaveHistory(e.target.checked))}/><span/></label></div>
      </div>
      <div className="setting-section danger-section"><div><h3>대화 기록 삭제</h3><p className="hint">저장 여부와 관계없이 현재 대화 기록을 삭제합니다. 저장한 컬렉션은 유지됩니다.</p></div>
        {confirmClear ? <div className="confirm-row"><button className="button danger" onClick={() => { dispatch(clearAllHistory()); onClear(); onClose(); }}>정말 모두 삭제</button><button className="button ghost" onClick={() => setConfirmClear(false)}>취소</button></div>
          : <button className="button ghost" onClick={() => setConfirmClear(true)}><Trash2 size={16}/> 기록 삭제</button>}
      </div>
    </section>
  </div>;
}

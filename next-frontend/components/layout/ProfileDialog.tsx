"use client";
import {
  Bug,
  Check,
  ClipboardCopy,
  FileText,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import WorkspaceSync from "@/components/layout/WorkspaceSync";
import { api, token, User } from "@/lib/accountApi";

export type ProfilePanel = "account" | "terms" | "privacy" | "bug";
type Props = { panel: ProfilePanel; onClose: () => void; onLogin: () => void };
const titles: Record<ProfilePanel, string> = {
  account: "계정 설정",
  terms: "DINOVO 이용약관",
  privacy: "개인정보처리방침",
  bug: "버그 신고",
};
export default function ProfileDialog({ panel, onClose, onLogin }: Props) {
  const [user, setUser] = useState<User | null>(null);
  const [description, setDescription] = useState("");
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState("");
  useEffect(() => {
    if (panel !== "account" || !token()) return;
    let active = true;
    void api<{ user: User }>("/api/auth/me")
      .then((r) => {
        if (active) setUser(r.user);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [panel]);
  useEffect(() => {
    function escape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);
  async function copyBug() {
    setCopyError("");
    try {
      await navigator.clipboard.writeText(
        `DINOVO 오류 제보\n발생 화면/동작: ${description}\n발생 일시: ${new Date().toLocaleString("ko-KR")}\n브라우저: ${navigator.userAgent}`,
      );
      setCopied(true);
    } catch {
      setCopyError("복사할 수 없습니다. 내용을 직접 선택해 복사해 주세요.");
    }
  }
  return (
    <div
      className="d-profile-dialog-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="d-profile-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={titles[panel]}
      >
        <header>
          <h2>
            {panel === "account" ? (
              <UserRound size={20} />
            ) : panel === "privacy" ? (
              <Shield size={20} />
            ) : panel === "bug" ? (
              <Bug size={20} />
            ) : (
              <FileText size={20} />
            )}{" "}
            {titles[panel]}
          </h2>
          <button type="button" onClick={onClose} aria-label="닫기">
            <X size={20} />
          </button>
        </header>
        {panel === "account" ? (
          <div className="d-profile-dialog-body">
            {user ? (
              <>
                <p>
                  <strong>이름</strong>
                  <span>{user.display_name}</span>
                </p>
                <p>
                  <strong>이메일</strong>
                  <span>{user.email}</span>
                </p>
                <WorkspaceSync />
                <p className="d-profile-disclaimer">
                  계정 정보 수정과 삭제는 아직 지원하지 않습니다. 운영 전 별도
                  구현이 필요합니다.
                </p>
              </>
            ) : (
              <>
                <p>계정 정보를 보려면 로그인해 주세요.</p>
                <button
                  className="d-profile-action"
                  type="button"
                  onClick={onLogin}
                >
                  로그인
                </button>
              </>
            )}
          </div>
        ) : panel === "terms" ? (
          <div className="d-profile-dialog-body">
            <p className="d-profile-disclaimer">
              안내: 아래 내용은 발표용 안내 초안입니다. 정식 이용약관이 아니며,
              운영 주체와 서비스 정책 확정 후 법률 검토가 필요합니다.
            </p>
            <h3>서비스 이용 안내</h3>
            <p>
              DINOVO는 AI를 활용한 음식점 검색·추천과 예약 진행 시뮬레이션을
              제공합니다.
            </p>
            <h3>예약 및 결제</h3>
            <p>
              현재 예약 기능은 시연용이며 실제 식당 예약이나 결제가 접수되지
              않습니다. 추후 외부 사업자 연동 시 별도 조건을 안내할 예정입니다.
            </p>
            <h3>AI 추천 결과</h3>
            <p>
              AI가 제공하는 장소 및 정보는 실제 영업 상황과 다를 수 있습니다.
              방문 전 식당의 공식 정보를 확인해 주세요.
            </p>
          </div>
        ) : panel === "privacy" ? (
          <div className="d-profile-dialog-body">
            <p className="d-profile-disclaimer">
              안내: 아래 내용은 개인정보처리방침 작성 전 검토용 초안입니다. 실제
              수집·저장·제공·보유·삭제 방식과 책임자 연락처를 확인한 후 정식
              공개해야 합니다.
            </p>
            <h3>확인해야 할 개인정보 처리 항목</h3>
            <p>
              회원 계정 정보, 소셜 로그인 식별자(연동 시), 예약 요청, AI 대화 및
              푸시 구독 데이터의 실제 수집 여부를 확인해야 합니다.
            </p>
            <h3>처리 목적 및 보유 기간</h3>
            <p>
              각 항목의 처리 목적, 보유 기간, 외부 서비스 제공 여부, 삭제 절차를
              운영 정책에 따라 확정해야 합니다.
            </p>
            <h3>문의 및 권리 행사</h3>
            <p>
              개인정보 보호책임자와 문의 창구가 확정된 뒤 정식 방침에 반영해야
              합니다.
            </p>
          </div>
        ) : (
          <div className="d-profile-dialog-body">
            <p>
              불편했던 화면과 오류 재현 방법을 작성해 주세요. 아래 기능은{" "}
              <strong>신고 내용을 복사</strong>하며, 서버로 자동 접수하지는
              않습니다.
            </p>
            <label htmlFor="d-bug-description">발생 화면 및 문제 설명</label>
            <textarea
              id="d-bug-description"
              rows={5}
              value={description}
              maxLength={2000}
              onChange={(e) => {
                setDescription(e.target.value);
                setCopied(false);
              }}
              placeholder="예: 식당 탐색에서 예약 버튼을 누르면 화면이 반응하지 않아요."
            />
            {copyError && <p role="alert">{copyError}</p>}
            <button
              className="d-profile-action"
              type="button"
              disabled={!description.trim()}
              onClick={() => void copyBug()}
            >
              {copied ? <Check size={17} /> : <ClipboardCopy size={17} />}{" "}
              {copied ? "신고 내용 복사됨" : "신고 내용 복사하기"}
            </button>
            <p className="d-profile-disclaimer">
              실제 신고 접수 기능과 고객지원 이메일은 추후 운영 정보가 확정되면
              연결합니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

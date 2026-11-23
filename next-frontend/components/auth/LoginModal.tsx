"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, X } from "lucide-react";
import { api, storeToken, type User } from "@/lib/accountApi";

type AuthResult = { user: User; access_token: string };
type Props = { onClose: () => void; onRegister: () => void };
export default function LoginModal({ onClose, onRegister }: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => {
    field.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function keydown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", keydown);
    };
  }, [onClose]);
  async function login(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await api<AuthResult>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      storeToken(result.access_token);
      window.dispatchEvent(new Event("dinovo:auth-changed"));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }
  return (
    <div
      className="d-auth-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className="d-auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-title"
      >
        <button
          type="button"
          className="d-auth-close"
          onClick={onClose}
          aria-label="로그인 창 닫기"
        >
          <X size={19} />
        </button>
        <div className="d-auth-logo">
          DINOVO<span>AI DINING CONCIERGE</span>
        </div>
        <p className="d-auth-overline">A MOMENT MADE FOR YOU</p>
        <h1 id="login-title">다시 만나 반갑습니다.</h1>
        <p className="d-auth-intro">당신만의 미식 여정을 이어가세요.</p>
        <form onSubmit={login} className="d-auth-form">
          <label>
            이메일
            <div className="d-auth-field">
              <Mail size={17} />
              <input
                ref={field}
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="이메일을 입력하세요"
              />
            </div>
          </label>
          <label>
            비밀번호
            <div className="d-auth-field">
              <LockKeyhole size={17} />
              <input
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="비밀번호를 입력하세요"
              />
              <button
                type="button"
                aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </label>
          {error && (
            <p className="d-auth-error" role="alert">
              {error}
            </p>
          )}
          <button className="d-primary" type="submit" disabled={loading}>
            {loading ? "로그인 중..." : "로그인"}
            <ArrowRight size={17} />
          </button>
        </form>
        <div className="d-auth-separator">
          <span>또는 소셜 계정으로 계속</span>
        </div>
        <div className="d-social">
          <button disabled title="OAuth 연동 예정">
            카카오 · 준비 중
          </button>
          <button disabled title="OAuth 연동 예정">
            Google · 준비 중
          </button>
          <button disabled title="OAuth 연동 예정">
            네이버 · 준비 중
          </button>
        </div>
        <p className="d-auth-bottom">
          아직 DINOVO 계정이 없으신가요?{" "}
          <button type="button" onClick={onRegister}>
            회원가입
          </button>
        </p>
      </section>
    </div>
  );
}

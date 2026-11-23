"use client";
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

import { api, clearToken, storeToken, token, User } from "@/lib/accountApi";

type Result = { user: User; access_token: string };
export default function AccountView({
  onBack,
  onLogin,
}: {
  onBack?: () => void;
  onLogin?: () => void;
}) {
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (token())
      void api<{ user: User }>("/api/auth/me")
        .then((x) => setUser(x.user))
        .catch(() => clearToken());
  }, []);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await api<Result>("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, display_name: name }),
      });
      storeToken(result.access_token);
      setUser(result.user);
      setPassword("");
      window.dispatchEvent(new Event("dinovo:auth-changed"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    setUser(null);
    window.dispatchEvent(new Event("dinovo:auth-changed"));
  }
  return (
    <main className="d-register-page">
      <button className="d-register-back" onClick={onBack} type="button">
        <ArrowLeft size={17} /> 서비스로 돌아가기
      </button>
      <div className="d-register-layout">
        <div className="d-register-story" aria-hidden="true">
          <div className="d-register-story-content">
            <span>THE DINOVO EXPERIENCE</span>
            <h2>
              한 번의 식사가
              <br />
              오래도록 기억되도록.
            </h2>
            <p>
              당신의 취향을 이해하는
              <br />
              새로운 다이닝 컨시어지.
            </p>
          </div>
        </div>
        <div className="d-register-card">
          <div className="d-auth-logo">
            DINOVO<span>AI DINING CONCIERGE</span>
          </div>
          {user ? (
            <>
              <p className="d-auth-overline">YOUR ACCOUNT</p>
              <h1>
                {user.display_name}님,
                <br />
                환영합니다.
              </h1>
              <p className="d-auth-intro">{user.email}</p>
              <p className="d-register-notice">
                발표용 SQLite에 저장된 계정은 Render 재시작·배포 시 초기화될 수
                있습니다.
              </p>
              <button className="d-primary" onClick={onBack}>
                DINOVO 둘러보기 <ArrowRight size={17} />
              </button>
              <button
                className="d-register-secondary"
                onClick={() => void logout()}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <p className="d-auth-overline">BECOME A MEMBER</p>
              <h1>
                당신만의 미식 여정을
                <br />
                시작해 보세요.
              </h1>
              <p className="d-auth-intro">
                DINOVO에 가입하고 취향과 예약을 한곳에서 관리하세요.
              </p>
              <form className="d-auth-form" onSubmit={submit}>
                <label>
                  닉네임
                  <div className="d-auth-field">
                    <UserRound size={17} />
                    <input
                      required
                      autoComplete="nickname"
                      maxLength={80}
                      placeholder="어떻게 불러드릴까요?"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </label>
                <label>
                  이메일
                  <div className="d-auth-field">
                    <Mail size={17} />
                    <input
                      required
                      type="email"
                      autoComplete="email"
                      placeholder="example@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </label>
                <label>
                  비밀번호
                  <div className="d-auth-field">
                    <LockKeyhole size={17} />
                    <input
                      required
                      type={show ? "text" : "password"}
                      minLength={10}
                      autoComplete="new-password"
                      placeholder="10자 이상 입력하세요"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      aria-label={show ? "비밀번호 숨기기" : "비밀번호 보기"}
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
                <p className="d-register-notice">
                  가입하면 발표용 계정이 생성됩니다. 소셜 로그인은 제공사 키를
                  설정한 경우에만 이용할 수 있습니다. 실제 예약·결제는
                  미연동입니다.
                </p>
                <button className="d-primary" type="submit" disabled={loading}>
                  {loading ? "가입 처리 중..." : "이메일로 회원가입"}
                  <ArrowRight size={17} />
                </button>
              </form>
              <p className="d-auth-bottom">
                이미 계정이 있으신가요?{" "}
                <button type="button" onClick={onLogin}>
                  로그인
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

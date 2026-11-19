"use client";
import { useEffect, useState } from "react";

import { api, clearToken, storeToken, token, User } from "@/lib/accountApi";

type AuthResult = { user: User; access_token: string };
export default function AccountView() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (token())
      void api<{ user: User }>("/api/auth/me")
        .then((v) => setUser(v.user))
        .catch(() => clearToken());
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const path = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const result = await api<AuthResult>(path, {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          ...(mode === "register" ? { display_name: name } : {}),
        }),
      });
      storeToken(result.access_token);
      setUser(result.user);
      setPassword("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "인증에 실패했습니다.");
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
  }
  return (
    <section className="account-view">
      <header>
        <p className="account-eyebrow">DINOVO ACCOUNT</p>
        <h1>내 계정</h1>
        <p>예약 승인·알림을 위한 DINOVO 계정입니다.</p>
      </header>
      {user ? (
        <div className="account-panel">
          <h2>{user.display_name}님, 안녕하세요.</h2>
          <p>{user.email}</p>
          <p className="account-note">
            현재는 발표용 SQLite 계정입니다. Render 무료 서비스가 재시작되면
            계정 데이터가 초기화될 수 있습니다.
          </p>
          <button onClick={logout}>로그아웃</button>
        </div>
      ) : (
        <div className="account-panel">
          <div className="account-tabs">
            <button
              className={mode === "login" ? "on" : ""}
              onClick={() => setMode("login")}
            >
              로그인
            </button>
            <button
              className={mode === "register" ? "on" : ""}
              onClick={() => setMode("register")}
            >
              회원가입
            </button>
          </div>
          <form onSubmit={(e) => void submit(e)}>
            {mode === "register" && (
              <label>
                닉네임
                <input
                  required
                  maxLength={80}
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
            )}
            <label>
              이메일
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label>
              비밀번호
              <input
                type="password"
                required
                minLength={mode === "register" ? 10 : 1}
                autoComplete={
                  mode === "register" ? "new-password" : "current-password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="account-error">
                {error}
              </p>
            )}
            <button type="submit" disabled={loading}>
              {loading
                ? "처리 중..."
                : mode === "login"
                  ? "로그인"
                  : "회원가입"}
            </button>
          </form>
          <p className="account-label">소셜 로그인 (API 연동 예정)</p>
          <div className="account-social">
            {["카카오", "네이버", "Google", "Apple"].map((p) => (
              <button key={p} disabled title="OAuth 연동 후 이용 가능">
                {p} · 준비 중
              </button>
            ))}
          </div>
          <p className="account-note">
            소셜 로그인은 아직 실제로 사용할 수 없습니다. 테스트 시 이메일
            계정을 이용해 주세요.
          </p>
        </div>
      )}
    </section>
  );
}

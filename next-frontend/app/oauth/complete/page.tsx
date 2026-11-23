"use client";
import { useEffect, useState } from "react";
import { api, storeToken } from "@/lib/accountApi";
const BASE_PATH = "/group/three/3";
export default function OAuthComplete() {
  const [message,setMessage] = useState("소셜 로그인을 확인하고 있습니다...");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ticket = params.get("ticket");
    // Immediately remove the one-use ticket from the browser URL and history.
    window.history.replaceState({}, "", `${BASE_PATH}/oauth/complete/`);
    if (!ticket) { setMessage("인증 확인 정보가 없습니다. 로그인 화면에서 다시 시도해 주세요."); return; }
    void api<{access_token:string}>("/api/auth/oauth/exchange",{
      method:"POST",body:JSON.stringify({ticket})
    }).then(result => {
      storeToken(result.access_token);
      window.location.replace(`${BASE_PATH}/`);
    }).catch(e => {setMessage(e instanceof Error?e.message:"소셜 로그인을 완료할 수 없습니다.");});
  },[]);
  return <main className="d-oauth-finish" role="status"><h1>DINOVO</h1><p>{message}</p><a href={`${BASE_PATH}/`}>홈으로 돌아가기</a></main>;
}

import type { Metadata } from "next";
import "./globals.css";
import Providers from "./Providers";

export const metadata: Metadata = {
  title: "DINOVO | 취향을 발견하는 미식 컨시어지",
  description: "AI와 함께 취향에 맞는 식당을 찾고, 비교하고, 예약 페이지로 연결하세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko" suppressHydrationWarning>
    <head><script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('dinovo-theme')||'system';var dark=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}` }}/></head>
    <body><Providers>{children}</Providers></body>
  </html>;
}

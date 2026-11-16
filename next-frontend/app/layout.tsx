import type { Metadata } from "next";
import "./globals.css";

import Providers from "./Providers";

export const metadata: Metadata = {
  title: "동네 AI | 우리 동네를 더 스마트하게",
  description: "AI와 함께 주변 맛집, 카페, 학원, 놀거리를 찾아보세요.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('dongne-ai-theme')||'system';var dark=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'dark':'light';document.documentElement.style.colorScheme=dark?'dark':'light'}catch(e){}`,
          }}
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

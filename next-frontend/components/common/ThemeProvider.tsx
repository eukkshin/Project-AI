"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ThemeChoice } from "@/lib/types";

interface ThemeContextValue {
  choice: ThemeChoice;
  resolved: "light" | "dark";
  setChoice: (theme: ThemeChoice) => void;
  toggle: () => void;
}
const ThemeContext = createContext<ThemeContextValue | null>(null);
const THEME_KEY = "dinovo-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>("system");
  const [systemDark, setSystemDark] = useState(false);
  const [ready, setReady] = useState(false);
  const resolved = choice === "system" ? (systemDark ? "dark" : "light") : choice;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(THEME_KEY);
      if (stored === "dark" || stored === "light" || stored === "system") setChoice(stored);
    } catch { /* storage can be disabled */ }
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    setSystemDark(media.matches);
    const listener = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", listener);
    setReady(true);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
    try { window.localStorage.setItem(THEME_KEY, choice); } catch { /* storage disabled */ }
  }, [choice, resolved, ready]);

  const value = useMemo(() => ({
    choice, resolved, setChoice, toggle: () => setChoice(resolved === "dark" ? "light" : "dark"),
  }), [choice, resolved]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme must be used within ThemeProvider");
  return value;
}

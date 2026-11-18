"use client";

import { useEffect } from "react";
import { Provider } from "react-redux";

import { ThemeProvider } from "@/components/common/ThemeProvider";
import { loadStoredState, saveStoredState } from "@/lib/storage";
import { hydrate } from "@/store/chatSlice";
import { store } from "@/store/store";

function PersistenceBridge({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    store.dispatch(hydrate(loadStoredState()));
    let timer: ReturnType<typeof setTimeout> | null = null;
    const persist = () => {
      const state = store.getState().chat;
      if (!state.hydrated) return;
      saveStoredState({
        district: state.selectedDistrict,
        saveHistory: state.saveHistory,
        sessions: state.saveHistory
          ? state.sessions
              .slice(0, 30)
              .map((s) => ({
                ...s,
                places: [],
                showMap: false,
                suggestedQuestions: [],
              }))
          : [],
        favorites: state.favorites.slice(0, 100),
      });
    };
    const unsubscribe = store.subscribe(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(persist, 250);
    });
    return () => {
      unsubscribe();
      if (timer) {
        clearTimeout(timer);
        persist();
      }
    };
  }, []);
  return <>{children}</>;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <PersistenceBridge>{children}</PersistenceBridge>
      </ThemeProvider>
    </Provider>
  );
}

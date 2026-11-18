import { createId } from "@/lib/createId";
import { placeKey } from "@/lib/types";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import type {
  ChatMessage,
  ChatResponse,
  ChatSession,
  MobileView,
  SavedRestaurant,
} from "@/lib/types";
import type { StoredState } from "@/lib/storage";

const createSession = (): ChatSession => ({
  id: createId(),
  title: "새 대화",
  messages: [],
  places: [],
  showMap: false,
  suggestedQuestions: [],
  updatedAt: Date.now(),
});

interface ChatState {
  sessions: ChatSession[];
  activeSessionId: string | null;
  selectedDistrict: string;
  inputText: string;
  isLoading: boolean;
  error: string | null;
  selectedPlaceKey: string | null;
  favorites: SavedRestaurant[];
  mobileView: MobileView;
  saveHistory: boolean;
  hydrated: boolean;
}

const initialState: ChatState = {
  sessions: [],
  activeSessionId: null,
  selectedDistrict: "노원구",
  inputText: "",
  isLoading: false,
  error: null,
  selectedPlaceKey: null,
  favorites: [],
  mobileView: "chat",
  saveHistory: false,
  hydrated: false,
};

const slice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    hydrate(state, action: PayloadAction<StoredState | null>) {
      const saved = action.payload;
      if (saved) {
        state.selectedDistrict = saved.district;
        state.favorites = saved.favorites;
        state.saveHistory = saved.saveHistory;
        state.sessions = saved.sessions;
      }
      if (state.sessions.length === 0) state.sessions = [createSession()];
      state.activeSessionId = state.sessions[0].id;
      state.hydrated = true;
    },
    newSession(state) {
      const empty = state.sessions.find((s) => s.messages.length === 0);
      const session = empty ?? createSession();
      if (!empty) state.sessions.unshift(session);
      state.activeSessionId = session.id;
      state.sessions = state.sessions.slice(0, 30);
      state.error = null;
      state.isLoading = false;
      state.inputText = "";
      state.selectedPlaceKey = null;
      state.mobileView = "chat";
    },
    selectSession(state, action: PayloadAction<string>) {
      if (!state.sessions.some((s) => s.id === action.payload)) return;
      state.activeSessionId = action.payload;
      state.error = null;
      state.isLoading = false;
      state.inputText = "";
      state.selectedPlaceKey = null;
      state.mobileView = "chat";
    },
    deleteSession(state, action: PayloadAction<string>) {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (!state.sessions.length) state.sessions = [createSession()];
      if (state.activeSessionId === action.payload)
        state.activeSessionId = state.sessions[0].id;
      state.error = null;
      state.isLoading = false;
      state.selectedPlaceKey = null;
    },
    setDistrict(state, action: PayloadAction<string>) {
      state.selectedDistrict = action.payload;
    },
    setInputText(state, action: PayloadAction<string>) {
      state.inputText = action.payload;
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    addMessage(
      state,
      action: PayloadAction<{ sessionId: string; message: ChatMessage }>,
    ) {
      const session = state.sessions.find(
        (s) => s.id === action.payload.sessionId,
      );
      if (!session) return;
      session.messages.push(action.payload.message);
      if (action.payload.message.sender === "user") {
        session.places = [];
        session.showMap = false;
        session.suggestedQuestions = [];
        state.selectedPlaceKey = null;
      }
      if (
        session.title === "새 대화" &&
        action.payload.message.sender === "user"
      )
        session.title =
          action.payload.message.text.slice(0, 26).trim() || "새 대화";
      session.updatedAt = Date.now();
    },
    applyResponse(
      state,
      action: PayloadAction<{ sessionId: string; response: ChatResponse }>,
    ) {
      const session = state.sessions.find(
        (s) => s.id === action.payload.sessionId,
      );
      if (!session) return;
      const response = action.payload.response;
      session.messages.push({
        id: createId(),
        sender: "assistant",
        text: response.reply,
        createdAt: Date.now(),
      });
      session.places = response.places;
      session.showMap = response.show_map && response.places.length > 0;
      session.suggestedQuestions = response.suggested_questions;
      session.updatedAt = Date.now();
      state.selectedPlaceKey = response.places.length
        ? placeKey(response.places[0])
        : null;
      state.mobileView = "chat";
    },
    choosePlace(state, action: PayloadAction<string>) {
      state.selectedPlaceKey = action.payload;
    },
    setMobileView(state, action: PayloadAction<MobileView>) {
      state.mobileView = action.payload;
    },
    toggleFavorite(state, action: PayloadAction<string>) {
      const name = action.payload.trim().slice(0, 90);
      if (!name) return;
      const i = state.favorites.findIndex((p) => p.name === name);
      if (i === -1) state.favorites.unshift({ name, createdAt: Date.now() });
      else state.favorites.splice(i, 1);
    },
    setSaveHistory(state, action: PayloadAction<boolean>) {
      state.saveHistory = action.payload;
    },
    clearAllHistory(state) {
      state.sessions = [createSession()];
      state.activeSessionId = state.sessions[0].id;
      state.error = null;
      state.isLoading = false;
      state.inputText = "";
      state.selectedPlaceKey = null;
    },
  },
});

export const {
  hydrate,
  newSession,
  selectSession,
  deleteSession,
  setDistrict,
  setInputText,
  setLoading,
  setError,
  addMessage,
  applyResponse,
  choosePlace,
  setMobileView,
  toggleFavorite,
  setSaveHistory,
  clearAllHistory,
} = slice.actions;
export default slice.reducer;

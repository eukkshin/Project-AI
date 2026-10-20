import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface Message {
  id: number;
  text: string;
  sender: "user" | "ai";
}

interface ChatState {
  message: Message[];
  inputText: string;
  isLoading: boolean;
  showMap: boolean;
}

const initialState: ChatState = {
  message: [
    {
      id: 1,
      text: "안녕하세요! 노원구 맛집이나 학원을 물어보세요. AI 어시스턴트입니다!",
      sender: "ai",
    },
  ],
  inputText: "",
  isLoading: false,
  showMap: false,
};

export const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setInputText: (state, action: PayloadAction<string>) => {
      state.inputText = action.payload;
    },
    setIsLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setShowMap: (state, action: PayloadAction<boolean>) => {
      state.showMap = action.payload;
    },
    addMessage: (state, action: PayloadAction<Message>) => {
      state.message.push(action.payload);
    },
  },
});

export const { setInputText, setIsLoading, setShowMap, addMessage } =
  chatSlice.actions;

export default chatSlice.reducer;

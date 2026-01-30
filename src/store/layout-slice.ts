import { createSlice } from "@reduxjs/toolkit";

export type LayoutTheme = "sidebar" | "no-sidebar";

type LayoutState = {
  theme: LayoutTheme;
  testMode: boolean;
};

const initialState: LayoutState = {
  theme: "sidebar",
  testMode: true,
};

export const layoutSlice = createSlice({
  name: "layout",
  initialState,
  reducers: {
    setTheme: (state, action: { payload: LayoutTheme }) => {
      state.theme = action.payload;
    },
    setTestMode: (state, action: { payload: boolean }) => {
      state.testMode = action.payload;
    },
  },
});

export const { setTheme, setTestMode } = layoutSlice.actions;

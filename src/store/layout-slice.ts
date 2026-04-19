import { createSlice } from "@reduxjs/toolkit";


export type LayoutTheme = "sidebar" | "no-sidebar";

type LayoutState = {
  theme: LayoutTheme;
  testMode: boolean;
  /** Sidebar layout only: flyout open on small viewports (not persisted). */
  mobileSidebarOpen: boolean;
};

const initialState: LayoutState = {
  theme: "sidebar",
  testMode: true,
  mobileSidebarOpen: false,
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
    setMobileSidebarOpen: (state, action: { payload: boolean }) => {
      state.mobileSidebarOpen = action.payload;
    },
    toggleMobileSidebar: (state) => {
      state.mobileSidebarOpen = !state.mobileSidebarOpen;
    },
  },
});

export const { setTheme, setTestMode, setMobileSidebarOpen, toggleMobileSidebar } =
  layoutSlice.actions;

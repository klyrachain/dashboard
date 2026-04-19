import { createSlice } from "@reduxjs/toolkit";


export type LayoutTheme = "sidebar" | "no-sidebar";

type LayoutState = {
  theme: LayoutTheme;
  testMode: boolean;
  /** Sidebar layout only: flyout open on small viewports (not persisted). */
  mobileSidebarOpen: boolean;
  /** Sidebar layout only (lg+): primary nav rail hidden to widen content (not persisted). */
  sidebarCollapsed: boolean;
};

const initialState: LayoutState = {
  theme: "sidebar",
  testMode: true,
  mobileSidebarOpen: false,
  sidebarCollapsed: false,
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
    setSidebarCollapsed: (state, action: { payload: boolean }) => {
      state.sidebarCollapsed = action.payload;
    },
    toggleSidebarCollapsed: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
  },
});

export const {
  setTheme,
  setTestMode,
  setMobileSidebarOpen,
  toggleMobileSidebar,
  setSidebarCollapsed,
  toggleSidebarCollapsed,
} = layoutSlice.actions;

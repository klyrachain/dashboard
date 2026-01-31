import { createSlice } from "@reduxjs/toolkit";

export type StatusIndicatorType = "saving" | "saved" | "error";

export type StatusIndicatorPosition =
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left";

type StatusIndicatorState = {
  message: string | null;
  type: StatusIndicatorType;
  position: StatusIndicatorPosition;
};

const initialState: StatusIndicatorState = {
  message: null,
  type: "saving",
  position: "bottom-right",
};

export const statusIndicatorSlice = createSlice({
  name: "statusIndicator",
  initialState,
  reducers: {
    showStatus: (
      state,
      action: {
        payload: {
          message: string;
          type?: StatusIndicatorType;
        };
      }
    ) => {
      state.message = action.payload.message;
      state.type = action.payload.type ?? "saving";
    },
    clearStatus: (state) => {
      state.message = null;
    },
    setStatusPosition: (
      state,
      action: { payload: StatusIndicatorPosition }
    ) => {
      state.position = action.payload;
    },
  },
});

export const { showStatus, clearStatus, setStatusPosition } =
  statusIndicatorSlice.actions;

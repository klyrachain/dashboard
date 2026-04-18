import { createSlice } from "@reduxjs/toolkit";
import type { AuthAdmin } from "@/types/auth";

const AUTH_STORAGE_KEY = "klyra_session_token";

export type AuthState = {
  token: string | null;
  admin: AuthAdmin | null;
  expiresAt: string | null;
};

const initialState: AuthState = {
  token: null,
  admin: null,
  expiresAt: null,
};

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setSession: (
      state,
      action: {
        payload: {
          token: string;
          admin: AuthAdmin;
          expiresAt: string;
        };
      }
    ) => {
      const { token, admin, expiresAt } = action.payload;
      state.token = token;
      state.admin = admin;
      state.expiresAt = expiresAt;
      // Session key is held by NextAuth (JWT cookie); Redux is synced for UI only.
    },
    clearSession: (state) => {
      state.token = null;
      state.admin = null;
      state.expiresAt = null;
    },
    setAdmin: (state, action: { payload: AuthAdmin | null }) => {
      state.admin = action.payload;
    },
    /** Optional platform session expiry from `/me` (NextAuth JWT metadata). */
    setSessionExpiresAt: (state, action: { payload: string | null }) => {
      state.expiresAt = action.payload;
    },
  },
});

export const { setSession, clearSession, setAdmin, setSessionExpiresAt } = authSlice.actions;

export function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return sessionStorage.getItem(AUTH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export { AUTH_STORAGE_KEY };

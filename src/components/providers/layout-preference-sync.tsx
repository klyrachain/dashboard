"use client";

import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import type { RootState } from "@/store";
import { setTheme, setTestMode } from "@/store/layout-slice";
import {
  getLayoutPreferenceFromCookie,
  setLayoutPreferenceCookie,
} from "@/lib/layout-preference-cookie";

/**
 * Syncs layout preference (theme, testMode) between Redux and cookie.
 * - On mount: reads cookie and hydrates Redux (in case client cookie differs from server-passed initial state).
 * - On layout state change: writes cookie.
 */
export function LayoutPreferenceSync() {
  const store = useStore<RootState>();
  const didHydrate = useRef(false);

  useEffect(() => {
    if (didHydrate.current) return;
    didHydrate.current = true;
    const pref = getLayoutPreferenceFromCookie();
    if (pref) {
      store.dispatch(setTheme(pref.theme));
      store.dispatch(setTestMode(pref.testMode));
    }
  }, [store]);

  useEffect(() => {
    let prevTheme: string | null = null;
    let prevTestMode: boolean | null = null;
    const unsubscribe = store.subscribe(() => {
      const state = store.getState().layout;
      if (state.theme !== prevTheme || state.testMode !== prevTestMode) {
        prevTheme = state.theme;
        prevTestMode = state.testMode;
        setLayoutPreferenceCookie({
          theme: state.theme,
          testMode: state.testMode,
        });
      }
    });
    return unsubscribe;
  }, [store]);

  return null;
}

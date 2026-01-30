"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import type { LayoutPreference } from "@/lib/layout-preference-cookie";

export function ReduxProvider({
  children,
  initialLayoutPreference,
}: {
  children: React.ReactNode;
  initialLayoutPreference?: LayoutPreference;
}) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore(initialLayoutPreference ?? null);
  }
  return <Provider store={storeRef.current}>{children}</Provider>;
}

"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "@/store";
import type { LayoutPreference } from "@/lib/layout-preference-cookie";
import type { MerchantSessionState } from "@/store/merchant-session-slice";
import { MerchantPortalReduxHydrate } from "@/components/providers/merchant-portal-redux-hydrate";

export function ReduxProvider({
  children,
  initialLayoutPreference,
  initialMerchantSession,
}: {
  children: React.ReactNode;
  initialLayoutPreference?: LayoutPreference;
  /** Hydrated from server GET /api/access (platform vs merchant, businesses). */
  initialMerchantSession?: Partial<MerchantSessionState> | null;
}) {
  const storeRef = useRef<ReturnType<typeof makeStore> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = makeStore({
      layout: initialLayoutPreference ?? null,
      merchantSession: initialMerchantSession ?? null,
    });
  }
  return (
    <Provider store={storeRef.current}>
      <MerchantPortalReduxHydrate serverSnapshot={initialMerchantSession ?? null} />
      {children}
    </Provider>
  );
}

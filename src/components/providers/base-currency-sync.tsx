"use client";

import { useEffect, useRef } from "react";
import { useStore } from "react-redux";
import type { RootState } from "@/store";
import { setBaseCurrency } from "@/store/preferences-slice";
import type { QuoteCurrency } from "@/lib/token-rates";

/**
 * Fetches platform base currency from settings and hydrates Redux.
 * All rate requests and currency selectors should use this value as default.
 */
export function BaseCurrencySync() {
  const store = useStore<RootState>();
  const didFetch = useRef(false);

  useEffect(() => {
    if (didFetch.current) return;
    didFetch.current = true;
    fetch("/api/settings/base-currency")
      .then((res) => res.json())
      .then((json: { success?: boolean; data?: { baseCurrency?: string } }) => {
        const base = json?.data?.baseCurrency;
        if (base === "usd" || base === "usdc" || base === "ghs") {
          store.dispatch(setBaseCurrency(base as QuoteCurrency));
        }
      })
      .catch(() => { });
  }, [store]);

  return null;
}

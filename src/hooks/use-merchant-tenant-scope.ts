"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";

/**
 * Aligns RTK `skip` with {@link baseQueryWithStatus}: same effective business id and portal JWT gate.
 */
export function useMerchantTenantScope() {
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const portalJwt = useSelector((s: RootState) => s.merchantSession.portalJwt);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);

  return useMemo(() => {
    const effectiveBusinessId =
      activeBusinessId ??
      (businesses.length === 1 ? businesses[0]?.id ?? null : null);
    const skipMerchantApi =
      sessionType !== "merchant" ||
      !portalJwt?.trim() ||
      !effectiveBusinessId;
    return { effectiveBusinessId, skipMerchantApi };
  }, [sessionType, portalJwt, activeBusinessId, businesses]);
}

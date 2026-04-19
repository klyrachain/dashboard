"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { getBusinessAccessToken } from "@/lib/businessAuthStorage";

/**
 * Aligns RTK `skip` with {@link baseQueryWithStatus}: same effective business id and Bearer token.
 * Redux `portalJwt` may be empty on the first paint even when `getBusinessAccessToken()` is set
 * (hydration order); the base query already falls back to session storage for Authorization.
 */
export function useMerchantTenantScope() {
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const portalJwt = useSelector((s: RootState) => s.merchantSession.portalJwt);
  const activeBusinessId = useSelector((s: RootState) => s.merchantSession.activeBusinessId);
  const businesses = useSelector((s: RootState) => s.merchantSession.businesses);
  const merchantEnvironment = useSelector((s: RootState) => s.merchantSession.merchantEnvironment);

  return useMemo(() => {
    const effectiveBusinessId =
      activeBusinessId ??
      (businesses.length === 1 ? businesses[0]?.id ?? null : null);
    const storedToken =
      typeof window !== "undefined" ? getBusinessAccessToken()?.trim() ?? "" : "";
    const hasPortalToken = Boolean(portalJwt?.trim() || storedToken);
    const skipMerchantApi =
      sessionType !== "merchant" || !hasPortalToken || !effectiveBusinessId;
    /** RTK cache partition: same page/limit must not reuse another business or TEST/LIVE slice. */
    const merchantApiScopeKey = `${effectiveBusinessId ?? ""}:${merchantEnvironment}`;
    return { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey };
  }, [sessionType, portalJwt, activeBusinessId, businesses, merchantEnvironment]);
}

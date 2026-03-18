import { getBusinessAccessToken } from "@/lib/businessAuthStorage";
import type { MerchantSessionState } from "@/store/merchant-session-slice";

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  try {
    const parts = jwt.split(".");
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4;
    if (pad) payload += "=".repeat(4 - pad);
    const json = typeof atob === "function" ? atob(payload) : "";
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function businessIdFromPortalJwt(jwt: string): string | null {
  const payload = decodeJwtPayload(jwt);
  if (!payload) return null;
  const candidates = [
    payload.businessId,
    payload.business_id,
    payload.bid,
    payload.tenantId,
    payload.tenant_id,
  ];
  for (const v of candidates) {
    if (typeof v === "string" && v.length > 0) return v;
  }
  return null;
}

/**
 * Merges server-hydrated merchant session with the stored portal JWT.
 * Without this, a full reload clears Redux while the JWT still lives in localStorage,
 * so `/api/v1/merchant/*` requests go out without Authorization.
 */
export function mergeMerchantSessionWithStoredPortalJwt(
  server: Partial<MerchantSessionState> | null | undefined
): Partial<MerchantSessionState> | null {
  if (typeof window === "undefined") {
    return server ?? null;
  }
  const token = getBusinessAccessToken();
  if (!token?.trim()) {
    return server ?? null;
  }

  const base = { ...(server ?? {}) };
  base.portalJwt = token.trim();
  base.sessionType = "merchant";

  if (!base.activeBusinessId) {
    const fromJwt = businessIdFromPortalJwt(token);
    if (fromJwt) {
      base.activeBusinessId = fromJwt;
    }
  }

  if (
    (!base.businesses || base.businesses.length === 0) &&
    base.activeBusinessId
  ) {
    base.businesses = [
      {
        id: base.activeBusinessId,
        name: "",
        slug: "",
      },
    ];
  }

  return base;
}

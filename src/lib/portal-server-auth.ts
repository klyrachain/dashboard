/**
 * HttpOnly portal cookies set by POST /api/portal/merchant-session — used for server-side Core fetches
 * (same pattern as Authorization + X-Business-Id on client merchant API calls).
 */
import { cookies } from "next/headers";
import {
  PORTAL_BUSINESS_ID_COOKIE,
  PORTAL_JWT_COOKIE,
  PORTAL_MERCHANT_ENV_COOKIE,
} from "@/lib/portal-cookie-names";

export type PortalSsrCoreAuth = {
  bearerToken: string;
  extraHeaders: Record<string, string>;
};

/** Core session + tenant headers when merchant portal SSR cookies are present. */
export async function getPortalSsrAuthForCore(): Promise<PortalSsrCoreAuth | null> {
  const c = await cookies();
  const jwt = c.get(PORTAL_JWT_COOKIE)?.value?.trim();
  if (!jwt) return null;
  const extra: Record<string, string> = {};
  const bid = c.get(PORTAL_BUSINESS_ID_COOKIE)?.value?.trim();
  if (bid) extra["X-Business-Id"] = bid;
  const env = c.get(PORTAL_MERCHANT_ENV_COOKIE)?.value?.trim().toUpperCase();
  if (env === "TEST" || env === "LIVE") {
    extra["x-merchant-environment"] = env;
  }
  return { bearerToken: jwt, extraHeaders: extra };
}

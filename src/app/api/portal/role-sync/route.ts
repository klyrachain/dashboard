import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import {
  MERCHANT_SSR_COOKIE,
  MERCHANT_SSR_VALUE,
  PORTAL_ROLE_COOKIE,
} from "@/lib/portal-cookie-names";

const MAX_AGE = 60 * 60 * 24 * 7;

const httpOnlyCookieBase = {
  path: "/" as const,
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  httpOnly: true,
};

function clearRoleCookie(res: NextResponse): void {
  res.cookies.set(PORTAL_ROLE_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
}

function clearMerchantSsrCookie(res: NextResponse): void {
  res.cookies.set(MERCHANT_SSR_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
}

/**
 * Sets HttpOnly `klyra_portal_role` for middleware. Only `platform` when a real
 * admin session exists. Refreshes `merchant` + SSR cookies only when both are already
 * present (session was verified via POST /api/portal/merchant-session). Never infer
 * platform from CORE_API_KEY alone.
 */
export async function GET() {
  const adminToken = await getSessionToken();

  if (adminToken) {
    const res = NextResponse.json({ ok: true, role: "platform" });
    res.cookies.set(PORTAL_ROLE_COOKIE, "platform", httpOnlyCookieBase);
    clearMerchantSsrCookie(res);
    return res;
  }

  const cookieStore = await cookies();
  const role = cookieStore.get(PORTAL_ROLE_COOKIE)?.value;
  const ssrOk = cookieStore.get(MERCHANT_SSR_COOKIE)?.value === MERCHANT_SSR_VALUE;

  if (role === "merchant" && ssrOk) {
    const res = NextResponse.json({ ok: true, role: "merchant" });
    res.cookies.set(PORTAL_ROLE_COOKIE, "merchant", httpOnlyCookieBase);
    res.cookies.set(MERCHANT_SSR_COOKIE, MERCHANT_SSR_VALUE, httpOnlyCookieBase);
    return res;
  }

  const res = NextResponse.json({ ok: true, role: null });
  clearRoleCookie(res);
  clearMerchantSsrCookie(res);
  return res;
}

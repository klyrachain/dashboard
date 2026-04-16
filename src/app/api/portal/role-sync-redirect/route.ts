import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import {
  MERCHANT_SSR_COOKIE,
  PORTAL_ROLE_COOKIE,
} from "@/lib/portal-cookie-names";

const MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Sets `klyra_portal_role=platform` only when a platform admin session exists,
 * then redirects home. Does not use server CORE_API_KEY to bypass login.
 */
export async function GET(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    const u = new URL("/login", request.url);
    u.searchParams.set("error", "platform_access");
    return NextResponse.redirect(u);
  }
  const home = new URL("/", request.url);
  const res = NextResponse.redirect(home);
  res.cookies.set(PORTAL_ROLE_COOKIE, "platform", {
    path: "/",
    sameSite: "lax",
    maxAge: MAX_AGE,
    httpOnly: true,
  });
  res.cookies.set(MERCHANT_SSR_COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";

const COOKIE = "klyra_portal_role";
const MAX_AGE = 60 * 60 * 24 * 7;

function clearRoleCookie(res: NextResponse): void {
  res.cookies.set(COOKIE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
}

/**
 * Sets HttpOnly `klyra_portal_role` for middleware. Only `platform` when a real
 * admin session exists; `merchant` when the cookie was already set via
 * POST /api/portal/merchant-session. Never infer platform from CORE_API_KEY alone.
 */
export async function GET() {
  const adminToken = await getSessionToken();

  if (adminToken) {
    const res = NextResponse.json({ ok: true, role: "platform" });
    res.cookies.set(COOKIE, "platform", {
      path: "/",
      sameSite: "lax",
      maxAge: MAX_AGE,
      httpOnly: true,
    });
    return res;
  }

  const cookieStore = await cookies();
  if (cookieStore.get(COOKIE)?.value === "merchant") {
    const res = NextResponse.json({ ok: true, role: "merchant" });
    res.cookies.set(COOKIE, "merchant", {
      path: "/",
      sameSite: "lax",
      maxAge: MAX_AGE,
      httpOnly: true,
    });
    return res;
  }

  const res = NextResponse.json({ ok: true, role: null });
  clearRoleCookie(res);
  return res;
}

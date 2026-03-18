import { NextResponse } from "next/server";
import { getAccessContext } from "@/lib/data-access";

const COOKIE = "klyra_portal_role";
const MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Sets HttpOnly-adjacent role cookie for middleware RBAC. Call once after load
 * so direct URL hits to admin routes are blocked on subsequent navigations.
 * Server-truth from GET /api/access.
 */
export async function GET() {
  const access = await getAccessContext();
  const role =
    access.ok && access.context?.type === "merchant" ? "merchant" : "platform";
  const res = NextResponse.json({ ok: true, role });
  res.cookies.set(COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: MAX_AGE,
    httpOnly: true,
  });
  return res;
}

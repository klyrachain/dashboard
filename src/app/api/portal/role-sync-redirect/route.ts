import { NextRequest, NextResponse } from "next/server";
import { getAccessContext } from "@/lib/data-access";

const COOKIE = "klyra_portal_role";
const MAX_AGE = 60 * 60 * 24 * 7;
const MERCHANT_ROLE = "merchant";
const PLATFORM_ROLE = "platform";

/**
 * Sets portal role cookie from server Core access context and redirects home.
 * For staff/platform dashboards where the deployment API key maps to platform access.
 */
export async function GET(request: NextRequest) {
  const access = await getAccessContext();
  if (!access.ok || !access.context) {
    const u = new URL("/business/login", request.url);
    u.searchParams.set("error", "platform_access");
    return NextResponse.redirect(u);
  }
  const role =
    access.context.type === "merchant" ? MERCHANT_ROLE : PLATFORM_ROLE;
  const home = new URL("/", request.url);
  const res = NextResponse.redirect(home);
  res.cookies.set(COOKIE, role, {
    path: "/",
    sameSite: "lax",
    maxAge: MAX_AGE,
    httpOnly: true,
  });
  return res;
}

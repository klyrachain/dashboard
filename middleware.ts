import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MERCHANT_ROLE = "merchant";
const PLATFORM_ROLE = "platform";

function hasPortalAccess(role: string | undefined): boolean {
  return role === PLATFORM_ROLE || role === MERCHANT_ROLE;
}

function isBusinessAuthPath(pathname: string): boolean {
  return pathname.startsWith("/business/");
}

/** Home allows anonymous only while completing email link or session restore. */
function homeAllowsWithoutPortalCookie(url: URL): boolean {
  if (Boolean(url.searchParams.get("login_code")?.trim())) return true;
  if (url.searchParams.get("session_bootstrap") === "1") return true;
  return false;
}

const MERCHANT_BLOCKED: string[] = [
  "/inventory",
  "/providers",
  "/connect",
  "/settings/financials",
  "/settings/providers",
  "/settings/risk",
];

function isBlockedForMerchant(pathname: string): boolean {
  return MERCHANT_BLOCKED.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const role = request.cookies.get("klyra_portal_role")?.value;
  const url = request.nextUrl.clone();

  if (isBusinessAuthPath(pathname)) {
    return NextResponse.next();
  }

  const onHome = pathname === "/";

  if (onHome && !hasPortalAccess(role)) {
    if (homeAllowsWithoutPortalCookie(request.nextUrl)) {
      return NextResponse.next();
    }
    url.pathname = "/business/login";
    url.search = "";
    const full = pathname + request.nextUrl.search;
    url.searchParams.set("return_to", full === "/" ? "/" : full);
    return NextResponse.redirect(url);
  }

  if (!onHome && !hasPortalAccess(role)) {
    url.pathname = "/";
    url.searchParams.set("session_bootstrap", "1");
    url.searchParams.set("return_to", pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (role === MERCHANT_ROLE && isBlockedForMerchant(pathname)) {
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};

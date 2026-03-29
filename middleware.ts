import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const MERCHANT_ROLE = "merchant";
const PLATFORM_ROLE = "platform";

function hasPortalAccess(role: string | undefined): boolean {
  return role === PLATFORM_ROLE || role === MERCHANT_ROLE;
}

function isPublicBusinessPortalPath(pathname: string): boolean {
  return pathname.startsWith("/business/");
}

/** Payer checkout paths: allow through or redirect to configured client checkout origin. */
function isPayerCheckoutPath(pathname: string): boolean {
  return (
    pathname === "/pay" ||
    pathname.startsWith("/pay/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/")
  );
}

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

function safeReturnToParam(pathWithQuery: string): string {
  const t = pathWithQuery.trim();
  if (!t || t === "/") return "/";
  const pathOnly = t.split("?")[0] ?? t;
  if (
    !pathOnly.startsWith("/") ||
    pathOnly.startsWith("//") ||
    pathOnly.startsWith("/api/")
  ) {
    return "/";
  }
  return t;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const url = request.nextUrl.clone();

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const adminToken = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (adminToken?.token) {
    return NextResponse.next();
  }

  const role = request.cookies.get("klyra_portal_role")?.value;

  if (isPublicBusinessPortalPath(pathname)) {
    return NextResponse.next();
  }

  if (isPayerCheckoutPath(pathname)) {
    const checkoutBase = process.env.NEXT_PUBLIC_CHECKOUT_BASE_URL?.trim().replace(
      /\/$/,
      ""
    );
    if (checkoutBase) {
      const dest = new URL(
        `${pathname}${request.nextUrl.search}`,
        checkoutBase.endsWith("/") ? checkoutBase : `${checkoutBase}/`
      );
      return NextResponse.redirect(dest);
    }
    return NextResponse.next();
  }

  const onHome = pathname === "/";

  if (onHome && !hasPortalAccess(role)) {
    if (homeAllowsWithoutPortalCookie(request.nextUrl)) {
      return NextResponse.next();
    }
    url.pathname = "/business/signin";
    url.search = "";
    const full = pathname + request.nextUrl.search;
    url.searchParams.set(
      "return_to",
      safeReturnToParam(full === "/" ? "/" : full)
    );
    return NextResponse.redirect(url);
  }

  if (!onHome && !hasPortalAccess(role)) {
    url.pathname = "/";
    url.searchParams.set("session_bootstrap", "1");
    url.searchParams.set(
      "return_to",
      safeReturnToParam(pathname + request.nextUrl.search)
    );
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
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|ico|png|jpg|jpeg|gif|webp|woff2)$).*)",
  ],
};
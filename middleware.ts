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

/** Only magic-link handoff on `/` — session recovery runs on `/business/signin` so SSR never ships the dashboard unauthenticated. */
function homeAllowsWithoutPortalCookie(url: URL): boolean {
  return Boolean(url.searchParams.get("login_code")?.trim());
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

/** Paths where stale platform cookie should clear and allow through (admin sign-in flows). */
function isAdminAuthPath(pathname: string): boolean {
  const p = pathname.replace(/\/$/, "") || "/";
  if (p === "/login" || p === "/signup" || p.startsWith("/setup-passkey")) return true;
  if (p.startsWith("/login/") || p.startsWith("/signup/")) return true;
  return false;
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

  /** Unauthenticated users must reach admin login/signup without being bounced to `/` + bootstrap. */
  if (isAdminAuthPath(pathname)) {
    return NextResponse.next();
  }

  const role = request.cookies.get("klyra_portal_role")?.value;

  /**
   * `klyra_portal_role=platform` must only apply when a platform admin session exists.
   * Otherwise GET /api/portal/role-sync could set it using CORE_API_KEY alone, which
   * incorrectly unlocked the dashboard after sign-out or for anonymous visitors.
   */
  if (role === PLATFORM_ROLE) {
    const cleared = {
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax" as const,
    };
    if (isAdminAuthPath(pathname)) {
      const res = NextResponse.next();
      res.cookies.set("klyra_portal_role", "", cleared);
      return res;
    }
    const signIn = new URL("/business/signin", request.url);
    signIn.searchParams.set(
      "return_to",
      safeReturnToParam(pathname + request.nextUrl.search)
    );
    const res = NextResponse.redirect(signIn);
    res.cookies.set("klyra_portal_role", "", cleared);
    return res;
  }

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
    const recover = new URL("/business/signin", request.url);
    recover.searchParams.set("session_bootstrap", "1");
    recover.searchParams.set(
      "return_to",
      safeReturnToParam(pathname + request.nextUrl.search)
    );
    return NextResponse.redirect(recover);
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
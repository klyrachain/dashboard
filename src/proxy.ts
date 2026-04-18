import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/** Paths that do not require authentication (login, signup, auth API). */
const PUBLIC_PATHS = ["/login", "/signup", "/api/auth"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function parseExpiresAtMs(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === "number") return Number.isNaN(raw) ? 0 : raw < 1e12 ? raw * 1000 : raw;
  const s = String(raw).trim();
  if (!s) return 0;
  const asNum = Number(s);
  if (!Number.isNaN(asNum) && s === String(asNum)) return asNum < 1e12 ? asNum * 1000 : asNum;
  const ms = new Date(s).getTime();
  return Number.isNaN(ms) ? 0 : ms;
}

function isSessionExpired(token: { expiresAt?: unknown } | null): boolean {
  if (!token?.expiresAt) return false;
  const ms = parseExpiresAtMs(token.expiresAt);
  return ms > 0 && Date.now() > ms;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  let token: { expiresAt?: unknown } | null = null;
  try {
    token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
  } catch {
    // getToken can throw if NEXTAUTH_SECRET is missing or invalid; treat as no session
  }

  const expired = isSessionExpired(token);

  if (isPublicPath(pathname)) {
    if (token && !expired) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (!token || expired) {
    const signIn = new URL("/login", request.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signIn);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Exclude NextAuth API routes so /api/auth/session always returns JSON (middleware must not run for auth)
    "/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2)$).*)",
  ],
};

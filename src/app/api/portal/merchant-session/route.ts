import { NextResponse } from "next/server";
import {
  MERCHANT_SSR_COOKIE,
  MERCHANT_SSR_VALUE,
  PORTAL_BUSINESS_ID_COOKIE,
  PORTAL_JWT_COOKIE,
  PORTAL_MERCHANT_ENV_COOKIE,
  PORTAL_ROLE_COOKIE,
} from "@/lib/portal-cookie-names";

const MAX_AGE = 60 * 60 * 24 * 7;

const httpOnlyCookieBase = {
  path: "/" as const,
  sameSite: "lax" as const,
  maxAge: MAX_AGE,
  httpOnly: true,
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function getCoreBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CORE_URL?.trim() || process.env.CORE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

type PortalSessionPayload = { businesses: { id: string }[] };

async function fetchPortalSession(
  coreBase: string,
  token: string
): Promise<PortalSessionPayload | null> {
  const res = await fetch(`${coreBase}/api/business-auth/session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return null;
  const body = (await res.json().catch(() => null)) as {
    success?: boolean;
    data?: { businesses?: { id: string }[] };
  } | null;
  if (!body?.success || !body.data || !Array.isArray(body.data.businesses)) {
    return null;
  }
  return { businesses: body.data.businesses };
}

export async function POST(request: Request) {
  const auth = request.headers.get("authorization");
  const token =
    auth?.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "Missing bearer token" },
      { status: 401 }
    );
  }

  const coreBase = getCoreBase();
  if (!coreBase) {
    return NextResponse.json(
      { ok: false, error: "Core API URL not configured" },
      { status: 503 }
    );
  }

  const session = await fetchPortalSession(coreBase, token);
  if (!session) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired portal session" },
      { status: 401 }
    );
  }

  const desiredBid = request.headers.get("x-business-id")?.trim() ?? "";
  const envHdr = request.headers.get("x-merchant-environment")?.trim().toUpperCase();
  const merchantEnv =
    envHdr === "TEST" || envHdr === "LIVE" ? envHdr : "LIVE";

  let businessId: string | undefined;
  if (
    desiredBid &&
    UUID_RE.test(desiredBid) &&
    session.businesses.some((b) => b.id === desiredBid)
  ) {
    businessId = desiredBid;
  } else if (session.businesses.length === 1) {
    businessId = session.businesses[0].id;
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(PORTAL_ROLE_COOKIE, "merchant", httpOnlyCookieBase);
  res.cookies.set(MERCHANT_SSR_COOKIE, MERCHANT_SSR_VALUE, httpOnlyCookieBase);
  res.cookies.set(PORTAL_JWT_COOKIE, token, httpOnlyCookieBase);
  res.cookies.set(PORTAL_MERCHANT_ENV_COOKIE, merchantEnv, httpOnlyCookieBase);
  if (businessId) {
    res.cookies.set(PORTAL_BUSINESS_ID_COOKIE, businessId, httpOnlyCookieBase);
  } else {
    clearCookie(res, PORTAL_BUSINESS_ID_COOKIE);
  }
  return res;
}

function clearCookie(res: NextResponse, name: string): void {
  res.cookies.set(name, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
}

/** Clears HttpOnly portal cookies (business logout / switch to platform). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  clearCookie(res, PORTAL_ROLE_COOKIE);
  clearCookie(res, MERCHANT_SSR_COOKIE);
  clearCookie(res, PORTAL_JWT_COOKIE);
  clearCookie(res, PORTAL_BUSINESS_ID_COOKIE);
  clearCookie(res, PORTAL_MERCHANT_ENV_COOKIE);
  return res;
}

import { NextResponse } from "next/server";

const COOKIE_ROLE = "klyra_portal_role";
const MAX_AGE = 60 * 60 * 24 * 7;

function getCoreBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CORE_URL?.trim() || process.env.CORE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

/** Valid portal JWT — works before user has completed onboarding / merchant business. */
async function verifyPortalSession(
  coreBase: string,
  token: string
): Promise<boolean> {
  const res = await fetch(`${coreBase}/api/business-auth/session`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  return res.ok;
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

  const valid = await verifyPortalSession(coreBase, token);
  if (!valid) {
    return NextResponse.json(
      { ok: false, error: "Invalid or expired portal session" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ROLE, "merchant", {
    path: "/",
    sameSite: "lax",
    maxAge: MAX_AGE,
    httpOnly: true,
  });
  return res;
}

/** Clears HttpOnly portal role cookie (business logout). */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_ROLE, "", {
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
  });
  return res;
}

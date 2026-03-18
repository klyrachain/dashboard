import { NextResponse } from "next/server";

const COOKIE_ROLE = "klyra_portal_role";
const MAX_AGE = 60 * 60 * 24 * 7;

function getCoreBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_CORE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

function businessIdFromJwt(token: string): string | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = payload.length % 4;
    if (pad) payload += "=".repeat(4 - pad);
    const json = Buffer.from(payload, "base64").toString("utf8");
    const p = JSON.parse(json) as Record<string, unknown>;
    for (const k of [
      "businessId",
      "business_id",
      "bid",
      "tenantId",
      "tenant_id",
    ]) {
      const v = p[k];
      if (typeof v === "string" && v.length > 0) return v;
    }
    return null;
  } catch {
    return null;
  }
}

async function verifyPortalToken(
  coreBase: string,
  token: string
): Promise<boolean> {
  const auth = `Bearer ${token}`;
  const tryFetch = async (headers: Record<string, string>) => {
    const res = await fetch(`${coreBase}/api/v1/merchant/business`, {
      method: "GET",
      headers: { Accept: "application/json", ...headers },
      signal: AbortSignal.timeout(15_000),
    });
    return res.ok;
  };

  if (await tryFetch({ Authorization: auth })) return true;
  const bid = businessIdFromJwt(token);
  if (bid) {
    return tryFetch({
      Authorization: auth,
      "X-Business-Id": bid,
    });
  }
  return false;
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

  const valid = await verifyPortalToken(coreBase, token);
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

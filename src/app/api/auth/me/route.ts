import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { getCoreAuthMe } from "@/lib/auth-api-server";
import { getPortalSsrAuthForCore } from "@/lib/portal-server-auth";

const UNAUTH_MESSAGE =
  "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>.";

function getCoreBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_CORE_URL ?? process.env.CORE_URL ?? "").replace(/\/$/, "");
}

export async function GET() {
  const token = await getSessionToken();
  if (token) {
    const result = await getCoreAuthMe(token);
    const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
    return NextResponse.json(result.data, { status });
  }

  const portal = await getPortalSsrAuthForCore();
  if (!portal) {
    return NextResponse.json(
      { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const base = getCoreBaseUrl();
  if (!base) {
    return NextResponse.json(
      { success: false, error: "Core URL not configured.", code: "SERVICE_UNAVAILABLE" },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${base}/api/business-auth/session`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${portal.bearerToken}`,
        Accept: "application/json",
        ...portal.extraHeaders,
      },
      signal: AbortSignal.timeout(15_000),
    });
    const body = (await res.json().catch(() => null)) as {
      success?: boolean;
      data?: { email?: string; portalDisplayName?: string | null };
    } | null;
    if (!res.ok || !body?.success || !body.data?.email) {
      return NextResponse.json(
        { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const { email, portalDisplayName } = body.data;
    return NextResponse.json({
      success: true,
      data: {
        sessionKind: "merchant_portal",
        email,
        name: portalDisplayName ?? null,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
}

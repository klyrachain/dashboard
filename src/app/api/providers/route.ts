import { NextResponse } from "next/server";
import { getCoreProviders } from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";

/**
 * GET /api/providers — proxy to Core. Requires session (Bearer).
 */
export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  try {
    const result = await getCoreProviders(token);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "Core API error" },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json(result.data);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

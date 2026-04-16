import { NextResponse } from "next/server";
import { getCoreValidationFailedRecent } from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";

/**
 * GET /api/validation/failed/recent — last N failures. Requires session (Bearer).
 */
export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const result = await getCoreValidationFailedRecent({
      limit: limit ? parseInt(limit, 10) : undefined,
    }, token);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "Core API error" },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json(result.data ?? { success: true, data: [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCoreValidationFailedRecent } from "@/lib/core-api";

/**
 * GET /api/validation/failed/recent — last N failures from Redis.
 * Proxy to Core. Query: limit (max 200).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const result = await getCoreValidationFailedRecent({
      limit: limit ? parseInt(limit, 10) : undefined,
    });
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

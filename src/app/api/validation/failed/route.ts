import { NextResponse } from "next/server";
import { getCoreValidationFailed } from "@/lib/core-api";

/**
 * GET /api/validation/failed — list failed validations (paginated).
 * Proxy to Core. Query: page, limit (max 100), code.
 * Requires platform admin API key (set in Core; dashboard uses CORE_API_KEY).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const code = searchParams.get("code") ?? undefined;
    const result = await getCoreValidationFailed({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      code: code || undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "Core API error" },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json(result.data ?? { success: true, data: [], meta: {} });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCoreValidationFailedReport } from "@/lib/core-api";

/**
 * GET /api/validation/failed/report — aggregated report for dashboard.
 * Proxy to Core. Query: days (1–90, default 7).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get("days");
    const result = await getCoreValidationFailedReport({
      days: days ? parseInt(days, 10) : undefined,
    });
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "Core API error" },
        { status: result.status ?? 502 }
      );
    }
    const raw = result.data;
    const data =
      raw && typeof raw === "object" && "data" in (raw as object)
        ? (raw as { data: unknown }).data
        : raw;
    return NextResponse.json({ success: true, data: data ?? null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

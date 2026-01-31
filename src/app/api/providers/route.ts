import { NextResponse } from "next/server";
import { getCoreProviders } from "@/lib/core-api";

/**
 * GET /api/providers — proxy to Core Provider Routing API.
 * List all providers (routing table). Platform admin only.
 */
export async function GET() {
  try {
    const result = await getCoreProviders();
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

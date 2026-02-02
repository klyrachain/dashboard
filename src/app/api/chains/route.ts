import { NextResponse } from "next/server";
import { getCoreChains } from "@/lib/core-api";

/**
 * GET /api/chains — proxy to Core API (public). Returns list of chains (chainId, name, icon).
 */
export async function GET() {
  try {
    const result = await getCoreChains();
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

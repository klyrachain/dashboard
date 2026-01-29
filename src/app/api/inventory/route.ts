import { NextResponse } from "next/server";
import { getCoreInventory } from "@/lib/core-api";

/**
 * GET /api/inventory — proxy to Core API.
 * Used by client (RTK Query) to avoid CORS and to cache inventory in Redux.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = searchParams.get("limit");
  const page = searchParams.get("page");
  const chain = searchParams.get("chain");

  try {
    const result = await getCoreInventory({
      limit: limit ? Number(limit) : 100,
      page: page ? Number(page) : undefined,
      chain: chain ?? undefined,
    });

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

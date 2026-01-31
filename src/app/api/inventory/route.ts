import { NextResponse } from "next/server";
import {
  getCoreInventory,
  postCoreInventory,
  type CreateCoreInventoryBody,
} from "@/lib/core-api";

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

/**
 * POST /api/inventory — create inventory asset (proxy to Core).
 * Body: { chain, token?, symbol?, balance?, walletAddress?, chainId? }.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCoreInventoryBody;
    if (!body?.chain || typeof body.chain !== "string") {
      return NextResponse.json(
        { success: false, error: "chain is required" },
        { status: 400 }
      );
    }
    const result = await postCoreInventory(body);
    if (!result.ok) {
      const err =
        result.data && typeof result.data === "object" && "error" in result.data
          ? String((result.data as { error: string }).error)
          : "Core API error";
      return NextResponse.json(
        { success: false, error: err },
        { status: result.status ?? 502 }
      );
    }
    return NextResponse.json(result.data ?? { success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

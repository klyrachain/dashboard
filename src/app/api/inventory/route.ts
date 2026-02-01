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
 * Body: { chain, chainId (required number), address (required), tokenAddress (required), token?, symbol?, balance?, walletAddress? }.
 */
export async function POST(request: Request) {
  try {
    if (!process.env.NEXT_PUBLIC_CORE_URL?.trim()) {
      return NextResponse.json(
        { success: false, error: "Core API URL not configured" },
        { status: 503 }
      );
    }
    const body = (await request.json()) as CreateCoreInventoryBody;
    const chain = body?.chain != null ? String(body.chain).trim() : "";
    if (!chain) {
      return NextResponse.json(
        { success: false, error: "chain is required" },
        { status: 400 }
      );
    }
    const chainId =
      body?.chainId != null
        ? typeof body.chainId === "number"
          ? body.chainId
          : parseInt(String(body.chainId), 10)
        : NaN;
    if (Number.isNaN(chainId) || chainId < 0) {
      return NextResponse.json(
        { success: false, error: "chainId is required and must be a number" },
        { status: 400 }
      );
    }
    const address =
      body?.address != null ? String(body.address).trim() : "";
    if (!address) {
      return NextResponse.json(
        { success: false, error: "address is required" },
        { status: 400 }
      );
    }
    const tokenAddress =
      body?.tokenAddress != null ? String(body.tokenAddress).trim() : "";
    if (!tokenAddress) {
      return NextResponse.json(
        { success: false, error: "tokenAddress is required" },
        { status: 400 }
      );
    }
    const result = await postCoreInventory({ ...body, chainId, address, tokenAddress });
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
    // Normalize: Core may return { success, data } or the asset directly
    const raw = result.data;
    const data =
      raw && typeof raw === "object" && "data" in raw
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

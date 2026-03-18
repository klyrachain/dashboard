import { NextResponse } from "next/server";
import { getCoreLots } from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";

/**
 * GET /api/lots — proxy to Core API. Requires session (Bearer).
 */
export async function GET(request: Request) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  const { searchParams } = new URL(request.url);
  const page = searchParams.get("page");
  const limit = searchParams.get("limit");
  const assetId = searchParams.get("assetId") ?? undefined;
  const chain = searchParams.get("chain") ?? undefined;
  const onlyAvailable = searchParams.get("onlyAvailable");
  const onlyAvailableBool =
    onlyAvailable === "true" ? true : onlyAvailable === "false" ? false : undefined;

  try {
    const result = await getCoreLots({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : 20,
      assetId: assetId?.trim() || undefined,
      chain: chain?.trim() || undefined,
      onlyAvailable: onlyAvailableBool,
    }, token);
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

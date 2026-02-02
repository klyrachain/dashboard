import { NextResponse } from "next/server";
import { getCoreInventoryLots } from "@/lib/core-api";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/inventory/:id/lots — proxy to Core API. Query: onlyAvailable?.
 */
export async function GET(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  const { searchParams } = new URL(request.url);
  const onlyAvailable = searchParams.get("onlyAvailable");
  const onlyAvailableBool =
    onlyAvailable === "true" ? true : onlyAvailable === "false" ? false : undefined;

  try {
    const result = await getCoreInventoryLots(id, { onlyAvailable: onlyAvailableBool });
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

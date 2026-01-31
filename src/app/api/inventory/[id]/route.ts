import { NextResponse } from "next/server";
import {
  getCoreInventoryAsset,
  patchCoreInventory,
  deleteCoreInventory,
  type UpdateCoreInventoryBody,
} from "@/lib/core-api";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const result = await getCoreInventoryAsset(id);
    if (!result.ok) {
      return NextResponse.json(
        { success: false, error: "Core API error" },
        { status: result.status ?? 404 }
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

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const body = (await request.json()) as UpdateCoreInventoryBody;
    const result = await patchCoreInventory(id, body);
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

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const result = await deleteCoreInventory(id);
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
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import {
  getCoreProviderById,
  patchCoreProvider,
  type UpdateCoreProviderBody,
} from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/providers/:id — fetch one provider (proxy to Core). Requires session (Bearer).
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const result = await getCoreProviderById(id, token);
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

/**
 * PATCH /api/providers/:id — update provider. Requires session (Bearer).
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_CORE_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const body = (await request.json()) as UpdateCoreProviderBody;
    const result = await patchCoreProvider(id, body, token);
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

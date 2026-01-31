import { NextResponse } from "next/server";
import { postCoreProviderRotateKey } from "@/lib/core-api";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * POST /api/providers/:id/rotate-key — set/rotate provider API key (proxy to Core).
 * Body: { apiKey: string }.
 */
export async function POST(request: Request, { params }: RouteParams) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json(
      { success: false, error: "id required" },
      { status: 400 }
    );
  }
  try {
    const body = (await request.json()) as { apiKey?: string };
    if (body?.apiKey == null || String(body.apiKey).trim() === "") {
      return NextResponse.json(
        { success: false, error: "apiKey is required" },
        { status: 400 }
      );
    }
    const result = await postCoreProviderRotateKey(id, { apiKey: String(body.apiKey).trim() });
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

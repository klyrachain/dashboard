/**
 * GET /api/logs — proxy to Core GET /api/logs (monitoring & filtering).
 * Query: method, path, since (ISO), page, limit (default 50, max 100).
 */

import { NextResponse } from "next/server";
import { getCoreLogs } from "@/lib/core-api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get("method") ?? undefined;
    const path = searchParams.get("path") ?? undefined;
    const since = searchParams.get("since") ?? undefined;
    const pageParam = searchParams.get("page");
    const limitParam = searchParams.get("limit");
    const page = pageParam ? Number(pageParam) : undefined;
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await getCoreLogs({ method, path, since, page, limit });

    if (!result.ok) {
      const err = result.data as { error?: string };
      return NextResponse.json(
        { success: false, error: err?.error ?? "Core API error" },
        { status: 502 }
      );
    }

    const envelope = result.data as { success?: boolean; data?: unknown[]; meta?: { page: number; limit: number; total: number } };
    if (envelope?.success !== true) {
      return NextResponse.json(
        { success: false, error: "Invalid Core response" },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      data: envelope.data ?? [],
      meta: envelope.meta ?? { page: 1, limit: 50, total: 0 },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

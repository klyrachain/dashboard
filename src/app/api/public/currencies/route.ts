import { NextRequest, NextResponse } from "next/server";
import { getCoreOrigin } from "@/lib/core-origin";

export async function GET(request: NextRequest) {
  const core = getCoreOrigin();
  if (!core) {
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_CORE_URL is not configured." },
      { status: 503 }
    );
  }
  const q = request.nextUrl.searchParams.get("q")?.trim();
  const url = new URL(`${core}/api/public/currencies`);
  if (q) url.searchParams.set("q", q);
  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(25_000),
    });
    const body: unknown = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Core for currencies." },
      { status: 502 }
    );
  }
}

import { NextResponse } from "next/server";
import { getCoreOrigin } from "@/lib/core-origin";

export async function GET() {
  const core = getCoreOrigin();
  if (!core) {
    return NextResponse.json(
      { success: false, error: "NEXT_PUBLIC_CORE_URL is not configured." },
      { status: 503 }
    );
  }
  try {
    const res = await fetch(`${core}/api/meta/checkout-base-url`, {
      next: { revalidate: 120 },
      signal: AbortSignal.timeout(12_000),
    });
    const body: unknown = await res.json().catch(() => ({}));
    return NextResponse.json(body, { status: res.status });
  } catch {
    return NextResponse.json(
      { success: false, error: "Could not reach Core for checkout base URL." },
      { status: 502 }
    );
  }
}

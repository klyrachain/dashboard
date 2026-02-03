import { NextResponse } from "next/server";
import { getCoreTokens } from "@/lib/core-api";
import { getSessionToken, UNAUTH_CORE_MESSAGE } from "@/lib/auth";

/**
 * GET /api/tokens — proxy to Core API. Requires session (Bearer).
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
  const chainId = searchParams.get("chain_id");
  const chainIdNum = chainId != null && chainId !== "" ? parseInt(chainId, 10) : undefined;

  try {
    const result = await getCoreTokens({
      chain_id: Number.isNaN(chainIdNum) ? undefined : chainIdNum,
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

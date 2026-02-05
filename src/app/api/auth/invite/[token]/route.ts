import { NextRequest, NextResponse } from "next/server";
import { getCoreAuthInvite } from "@/lib/auth-api-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token?.trim()) {
    return NextResponse.json(
      { success: false, error: "Token required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const result = await getCoreAuthInvite(token);
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthSetup } from "@/lib/auth-api-server";

export async function POST(request: NextRequest) {
  let body: { inviteToken?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const inviteToken =
    typeof body.inviteToken === "string" ? body.inviteToken.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!inviteToken || !password) {
    return NextResponse.json(
      { success: false, error: "inviteToken and password required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const result = await postCoreAuthSetup({ inviteToken, password });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

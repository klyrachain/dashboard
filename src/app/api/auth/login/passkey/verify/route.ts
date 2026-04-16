import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthLoginPasskeyVerify } from "@/lib/auth-api-server";

export async function POST(request: NextRequest) {
  let body: { email?: string; response?: unknown; sessionTtlMinutes?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email || body.response === undefined) {
    return NextResponse.json(
      { success: false, error: "email and response required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const rawTtl = body.sessionTtlMinutes;
  const sessionTtlMinutes =
    rawTtl === 15 || rawTtl === 30 ? rawTtl : undefined;
  const result = await postCoreAuthLoginPasskeyVerify({
    email,
    response: body.response,
    sessionTtlMinutes,
  });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

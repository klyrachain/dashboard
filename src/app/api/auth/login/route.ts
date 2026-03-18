import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthLogin } from "@/lib/auth-api-server";

export async function POST(request: NextRequest) {
  let body: {
    email?: string;
    password?: string;
    code?: string;
    sessionTtlMinutes?: 15 | 30;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!email || !password || !code) {
    return NextResponse.json(
      { success: false, error: "email, password, and code required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const result = await postCoreAuthLogin({
    email,
    password,
    code,
    sessionTtlMinutes: body.sessionTtlMinutes,
  });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

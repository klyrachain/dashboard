import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthLoginPasskeyOptions } from "@/lib/auth-api-server";

export async function POST(request: NextRequest) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { success: false, error: "email required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const result = await postCoreAuthLoginPasskeyOptions({ email });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

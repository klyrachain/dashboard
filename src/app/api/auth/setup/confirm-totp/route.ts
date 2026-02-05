import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthSetupConfirmTotp } from "@/lib/auth-api-server";

export async function POST(request: NextRequest) {
  let body: { adminId?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const adminId = typeof body.adminId === "string" ? body.adminId.trim() : "";
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!adminId || !code) {
    return NextResponse.json(
      { success: false, error: "adminId and code required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const result = await postCoreAuthSetupConfirmTotp({ adminId, code });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

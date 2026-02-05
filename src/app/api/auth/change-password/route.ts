import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { postCoreAuthChangePassword } from "@/lib/auth-api-server";

const UNAUTH_MESSAGE =
  "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>.";

export async function POST(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }
  const currentPassword =
    typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword =
    typeof body.newPassword === "string" ? body.newPassword : "";
  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: "currentPassword and newPassword are required" },
      { status: 400 }
    );
  }
  const result = await postCoreAuthChangePassword(token, {
    currentPassword,
    newPassword,
  });
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { getCoreAuthPasskeyOptions } from "@/lib/auth-api-server";

const UNAUTH_MESSAGE =
  "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>.";

export async function GET() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  const result = await getCoreAuthPasskeyOptions(token);
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

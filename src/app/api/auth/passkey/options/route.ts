import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { getCoreAuthPasskeyOptions } from "@/lib/auth-api-server";
import { getBrowserOriginForWebAuthn } from "@/lib/request-origin";

const UNAUTH_MESSAGE =
  "Not authenticated. Provide x-api-key (platform) or Authorization: Bearer <session>.";

export async function GET(request: NextRequest) {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json(
      { success: false, error: UNAUTH_MESSAGE, code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }
  const origin = getBrowserOriginForWebAuthn(request);
  const result = await getCoreAuthPasskeyOptions(token, origin);
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

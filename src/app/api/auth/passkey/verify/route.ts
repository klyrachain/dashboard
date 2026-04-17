import { NextRequest, NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth";
import { postCoreAuthPasskeyVerify } from "@/lib/auth-api-server";
import { getBrowserOriginForWebAuthn } from "@/lib/request-origin";

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
  let body: { response?: unknown; name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  if (body.response === undefined) {
    return NextResponse.json(
      { success: false, error: "response required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const origin = getBrowserOriginForWebAuthn(request);
  const result = await postCoreAuthPasskeyVerify(
    token,
    {
      response: body.response,
      name: typeof body.name === "string" ? body.name : undefined,
    },
    origin
  );
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

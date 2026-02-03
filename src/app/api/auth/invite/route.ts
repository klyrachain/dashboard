import { NextRequest, NextResponse } from "next/server";
import { postCoreAuthInviteCreate } from "@/lib/auth-api-server";

function getBearerToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/**
 * POST /api/auth/invite — create invite (super_admin only).
 * Auth: Bearer token (from session) or x-api-key from env (server-side).
 */
export async function POST(request: NextRequest) {
  let body: { email?: string; role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role =
    typeof body.role === "string" ? body.role.trim() : "viewer";
  if (!email) {
    return NextResponse.json(
      { success: false, error: "email required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }
  const bearerToken = getBearerToken(request);
  const result = await postCoreAuthInviteCreate(
    { email, role },
    { bearerToken: bearerToken ?? undefined }
  );
  const status = result.status >= 400 ? result.status : result.ok ? 200 : 502;
  return NextResponse.json(result.data, { status });
}

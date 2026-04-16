import { NextRequest, NextResponse } from "next/server";

const MAX_BODY = 16_384;

/**
 * Receives client-side error reports from error.tsx / global-error.tsx and logs on the Next.js server (stdout).
 * Optional: set CLIENT_ERROR_LOG_SECRET and send header x-client-error-secret from the client when you add it to the logging helper.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CLIENT_ERROR_LOG_SECRET?.trim();
  if (secret) {
    if (req.headers.get("x-client-error-secret") !== secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  let raw: string;
  try {
    raw = await req.text();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (raw.length > MAX_BODY) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const message =
    typeof o.message === "string" ? o.message.slice(0, 2000) : "(no message)";
  const digest = typeof o.digest === "string" ? o.digest : undefined;
  const pathname =
    typeof o.pathname === "string" ? o.pathname.slice(0, 1024) : undefined;
  const stack = typeof o.stack === "string" ? o.stack.slice(0, 8000) : undefined;

  console.error(
    "[client-error]",
    JSON.stringify({ message, digest, pathname, stack })
  );

  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";

const TIMEOUT_MS = 45_000;

function getCoreBase(): string | null {
  const raw =
    process.env.NEXT_PUBLIC_CORE_URL?.trim() ||
    process.env.CORE_URL?.trim() ||
    "";
  return raw.replace(/\/$/, "") || null;
}

async function proxyToCore(
  request: Request,
  pathSegments: string[] | undefined
): Promise<NextResponse> {
  const base = getCoreBase();
  if (!base) {
    return NextResponse.json(
      { error: "Core URL not configured (NEXT_PUBLIC_CORE_URL)" },
      { status: 503 }
    );
  }

  const suffix = (pathSegments ?? []).join("/");
  const corePath = suffix
    ? `/api/business-auth/${suffix}`
    : "/api/business-auth";
  const search = new URL(request.url).search;
  const targetUrl = `${base}${corePath}${search}`;

  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const accept = request.headers.get("accept");
  headers.set("Accept", accept ?? "application/json");
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  let webauthnOrigin = origin;
  if (!webauthnOrigin && referer) {
    try {
      webauthnOrigin = new URL(referer).origin;
    } catch {
      /* ignore */
    }
  }
  if (webauthnOrigin) headers.set("X-WebAuthn-Origin", webauthnOrigin);

  const method = request.method.toUpperCase();
  let body: string | undefined;
  if (method !== "GET" && method !== "HEAD") {
    body = await request.text();
    const ct = request.headers.get("content-type");
    if (ct) headers.set("Content-Type", ct);
  }

  let res: Response;
  try {
    res = await fetch(targetUrl, {
      method,
      headers,
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json(
      { error: message },
      { status: 502 }
    );
  }

  if (res.status >= 300 && res.status < 400) {
    const loc = res.headers.get("location");
    if (loc) {
      return NextResponse.redirect(loc, res.status);
    }
  }

  const status = res.status;
  const buf = await res.arrayBuffer();
  const rawCt = res.headers.get("content-type") ?? "";
  const text = new TextDecoder().decode(buf);

  if (status >= 400 && text.trim().length > 0) {
    if (rawCt.includes("text/html")) {
      return NextResponse.json(
        {
          success: false,
          error: "Core returned HTML instead of JSON.",
          code: "UPSTREAM_HTML_ERROR",
        },
        { status }
      );
    }
    try {
      JSON.parse(text);
    } catch {
      const looksHtml = /^\s*</.test(text);
      if (looksHtml) {
        return NextResponse.json(
          {
            success: false,
            error: "Core returned HTML instead of JSON.",
            code: "UPSTREAM_HTML_ERROR",
          },
          { status }
        );
      }
      return NextResponse.json(
        {
          success: false,
          error: res.statusText || "Upstream error",
          code: "UPSTREAM_NON_JSON",
        },
        { status }
      );
    }
  }

  const out = new NextResponse(buf, { status: res.status });
  if (rawCt) out.headers.set("Content-Type", rawCt);
  return out;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxyToCore(request, path);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxyToCore(request, path);
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxyToCore(request, path);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxyToCore(request, path);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params;
  return proxyToCore(request, path);
}

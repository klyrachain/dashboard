import { NextResponse } from "next/server";

const INVOICES_PROXY_TIMEOUT_MS = 60_000;

function getCoreBase(): string | null {
  const raw = process.env.NEXT_PUBLIC_CORE_URL?.trim();
  if (!raw) return null;
  return raw.replace(/\/$/, "");
}

async function proxyToCore(
  request: Request,
  params: Promise<{ path?: string[] }>
): Promise<NextResponse> {
  const base = getCoreBase();
  if (!base) {
    return NextResponse.json(
      { success: false, error: "Core API URL not configured" },
      { status: 503 }
    );
  }

  const { path: segments } = await params;
  const suffix = (segments ?? []).join("/");
  const search = new URL(request.url).search;
  const corePath = suffix
    ? `/api/invoices/${suffix}${search}`
    : `/api/invoices${search}`;
  const targetUrl = `${base}${corePath}`;

  const headers = new Headers();
  const auth = request.headers.get("authorization");
  if (auth) headers.set("Authorization", auth);
  const businessId = request.headers.get("x-business-id");
  if (businessId) headers.set("X-Business-Id", businessId);

  const merchantEnv = request.headers.get("x-merchant-environment");
  if (merchantEnv) headers.set("x-merchant-environment", merchantEnv);

  const apiKey = request.headers.get("x-api-key");
  if (apiKey) headers.set("x-api-key", apiKey);

  const accept = request.headers.get("accept");
  headers.set("Accept", accept ?? "application/json");

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
      signal: AbortSignal.timeout(INVOICES_PROXY_TIMEOUT_MS),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upstream request failed";
    return NextResponse.json(
      { success: false, error: message },
      { status: 502 }
    );
  }

  const buf = await res.arrayBuffer();
  const out = new NextResponse(buf, { status: res.status });
  const ct = res.headers.get("content-type");
  if (ct) out.headers.set("Content-Type", ct);
  const disposition = res.headers.get("content-disposition");
  if (disposition) out.headers.set("Content-Disposition", disposition);
  return out;
}

export async function GET(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxyToCore(request, ctx.params);
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxyToCore(request, ctx.params);
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxyToCore(request, ctx.params);
}

export async function PUT(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxyToCore(request, ctx.params);
}

export async function DELETE(
  request: Request,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  return proxyToCore(request, ctx.params);
}

import { NextResponse } from "next/server";
import {
  fetchRates,
  type AssetKey,
  type QuoteCurrency,
} from "@/lib/token-rates";

const QUOTE_SET: QuoteCurrency[] = ["usd", "usdc", "ghs"];

function parseAssets(value: string | null): AssetKey[] {
  if (!value || typeof value !== "string") return [];
  try {
    const raw = JSON.parse(value) as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (x): x is { chain: string; token: string } =>
          x != null &&
          typeof x === "object" &&
          typeof (x as { chain?: unknown }).chain === "string" &&
          typeof (x as { token?: unknown }).token === "string"
      )
      .map((x) => ({ chain: x.chain.trim(), token: x.token.trim() }))
      .filter((x) => x.chain.length > 0 && x.token.length > 0);
  } catch {
    return [];
  }
}

function parseVs(value: string | null): QuoteCurrency[] {
  if (!value || typeof value !== "string") return QUOTE_SET;
  const parts = value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0);
  const allowed = new Set<QuoteCurrency>(["usd", "usdc", "ghs"]);
  return parts.filter((v): v is QuoteCurrency => allowed.has(v as QuoteCurrency));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetsParam = searchParams.get("assets");
  const vsParam = searchParams.get("vs");

  const assets = parseAssets(assetsParam);
  const vs = parseVs(vsParam).length > 0 ? parseVs(vsParam) : QUOTE_SET;

  const rates = await fetchRates(assets, vs);

  return NextResponse.json({
    success: true,
    data: rates,
  });
}

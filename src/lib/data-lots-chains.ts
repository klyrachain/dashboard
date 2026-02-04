/**
 * Inventory lots, chains, and tokens — Core API (GET /api/lots, /api/chains, /api/tokens).
 */
import {
  getCoreLots,
  getCoreChains,
  getCoreTokens,
} from "@/lib/core-api";
import { getSessionToken } from "@/lib/auth";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" && !Number.isNaN(v) ? v : parseFloat(String(v));
  return Number.isNaN(n) ? undefined : n;
}

// ——— Lots ———

export type LotAssetSummary = {
  id: string;
  chain?: string;
  symbol?: string;
};

export type LotRow = {
  id: string;
  assetId: string;
  originalQuantity: string;
  remainingQuantity: string;
  costPerTokenUsd: string;
  totalCostUsd: string;
  status: "OPEN" | "DEPLETED";
  acquiredAt: string;
  sourceType: string | null;
  sourceTransactionId: string | null;
  asset: LotAssetSummary;
};

function parseLot(item: unknown): LotRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const asset = o.asset as Record<string, unknown> | undefined;
  const assetSummary: LotAssetSummary = {
    id: asset ? str(asset.id) : str(o.assetId),
    chain: asset ? str(asset.chain) : undefined,
    symbol: asset ? str(asset.symbol ?? asset.token) : undefined,
  };
  const statusRaw = str(o.status ?? "").toUpperCase();
  const status: LotRow["status"] =
    statusRaw === "OPEN" || statusRaw === "DEPLETED" ? statusRaw : "OPEN";
  return {
    id,
    assetId: str(o.assetId),
    originalQuantity: str(o.originalQuantity ?? ""),
    remainingQuantity: str(o.remainingQuantity ?? ""),
    costPerTokenUsd: str(o.costPerTokenUsd ?? ""),
    totalCostUsd: str(o.totalCostUsd ?? ""),
    status,
    acquiredAt: str(o.acquiredAt ?? ""),
    sourceType: o.sourceType != null ? str(o.sourceType) : null,
    sourceTransactionId: o.sourceTransactionId != null ? str(o.sourceTransactionId) : null,
    asset: assetSummary,
  };
}

export type LotsListResult = {
  items: LotRow[];
  meta: { page: number; limit: number; total: number };
};

export async function getLotsList(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
  onlyAvailable?: boolean;
}): Promise<LotsListResult> {
  const defaultMeta = { page: params?.page ?? 1, limit: params?.limit ?? 20, total: 0 };
  try {
    const token = await getSessionToken();
    const result = await getCoreLots({
      page: params?.page,
      limit: params?.limit ?? 20,
      assetId: params?.assetId,
      chain: params?.chain,
      onlyAvailable: params?.onlyAvailable,
    }, token ?? undefined);
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return { items: [], meta: defaultMeta };
    }
    const envelope = result.data as {
      success?: boolean;
      data?: unknown[];
      meta?: { page?: number; limit?: number; total?: number };
    };
    const raw = Array.isArray(envelope?.data) ? envelope.data : Array.isArray(result.data) ? (result.data as unknown[]) : [];
    const items = raw.map(parseLot).filter((r): r is LotRow => r !== null);
    const meta = envelope.meta ?? {};
    return {
      items,
      meta: {
        page: meta.page ?? defaultMeta.page,
        limit: meta.limit ?? defaultMeta.limit,
        total: meta.total ?? items.length,
      },
    };
  } catch {
    return { items: [], meta: defaultMeta };
  }
}

/** Summary: total remaining quantity and total cost (USD) of remaining across lots. */
export function lotsSummary(lots: LotRow[]): { totalQuantity: number; totalCost: number } {
  let totalQuantity = 0;
  let totalCost = 0;
  for (const lot of lots) {
    const q = num(lot.remainingQuantity) ?? 0;
    const c = num(lot.costPerTokenUsd) ?? 0;
    totalQuantity += q;
    totalCost += q * c;
  }
  return { totalQuantity, totalCost };
}

// ——— Chains ———

export type ChainRow = {
  id?: string;
  chainId: number;
  name: string;
  icon?: string;
};

function parseChain(item: unknown): ChainRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const chainId = num(o.chain_id ?? o.chainId) ?? num(o.id);
  if (chainId == null) return null;
  return {
    id: o.id != null ? str(o.id) : undefined,
    chainId: Number(chainId),
    name: str(o.name ?? o.chain),
    icon: str(o.icon ?? o.icon_uri ?? "").trim() || undefined,
  };
}

export async function getChains(): Promise<ChainRow[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreChains(token ?? undefined);
    if (!result.ok || !result.data || typeof result.data !== "object") return [];
    const envelope = result.data as { success?: boolean; data?: unknown[] };
    const raw = Array.isArray(envelope.data) ? envelope.data : Array.isArray(result.data) ? (result.data as unknown[]) : [];
    return raw.map(parseChain).filter((r): r is ChainRow => r !== null);
  } catch {
    return [];
  }
}

// ——— Tokens ———

export type TokenRow = {
  id?: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  decimals?: number;
  name?: string;
  logoUri?: string;
  fonbnkCode?: string;
};

function parseToken(item: unknown): TokenRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const chainId = num(o.chain_id ?? o.chainId);
  const tokenAddress = str(o.token_address ?? o.tokenAddress);
  const symbol = str(o.symbol);
  if (chainId == null || !tokenAddress || !symbol) return null;
  return {
    id: o.id != null ? str(o.id) : undefined,
    chainId: Number(chainId),
    tokenAddress,
    symbol,
    decimals: num(o.decimals),
    name: str(o.name).trim() || undefined,
    logoUri: str(o.logo_uri ?? o.logoUri).trim() || undefined,
    fonbnkCode: str(o.fonbnk_code ?? o.fonbnkCode).trim() || undefined,
  };
}

export async function getTokens(chainId?: number): Promise<TokenRow[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreTokens({ chain_id: chainId }, token ?? undefined);
    if (!result.ok || !result.data || typeof result.data !== "object") return [];
    const envelope = result.data as { success?: boolean; data?: unknown[] };
    const raw = Array.isArray(envelope.data) ? envelope.data : Array.isArray(result.data) ? (result.data as unknown[]) : [];
    return raw.map(parseToken).filter((r): r is TokenRow => r !== null);
  } catch {
    return [];
  }
}

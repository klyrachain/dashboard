/**
 * Balances page data — chain-specific liquidity and aggregated assets.
 * All data from Core API only (GET /api/inventory, GET /api/transactions, GET /api/claims).
 * No database fallback.
 */

import {
  getCoreInventory,
  getCoreTransactions,
  getCoreClaims,
} from "@/lib/core-api";
import { getTokenUsdRate } from "@/lib/token-rates";

export type ChainId = "ethereum" | "base" | "arbitrum" | "bnb";

export interface TokenBalance {
  symbol: string;
  amount: number;
}

export interface ChainBalance {
  chainId: ChainId;
  chainName: string;
  healthy: boolean;
  tokens: TokenBalance[];
  totalUsd: number;
}

export interface AggregatedAsset {
  symbol: string;
  totalAmount: number;
  breakdown: { chainId: ChainId; amount: number; sharePercent: number }[];
}

export interface PendingState {
  floatingAmountUsd: number;
  activeOrdersCount: number;
  capacityUsedPercent: number;
}

export interface ClaimableState {
  totalUsd: number;
  byCurrency: { symbol: string; amount: number }[];
}

/** Recent activity row (data from poll). */
export interface BalanceActivity {
  id: string;
  fees: number;
  total: number;
  type: string;
  description: string;
  created: Date;
  availableOn: Date;
}

/** Format numbers with comma separation (no decimals for large numbers). */
export function formatAmount(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format currency with $ and commas. */
export function formatCurrency(value: number, decimals = 2): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

const EMPTY_PENDING: PendingState = {
  floatingAmountUsd: 0,
  activeOrdersCount: 0,
  capacityUsedPercent: 0,
};

const EMPTY_CLAIMABLE: ClaimableState = {
  totalUsd: 0,
  byCurrency: [],
};

/** Normalize Core inventory item to { chain, token, balance }. */
function parseInventoryItem(
  item: unknown
): { chain: string; token: string; balance: number } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const chain = String(o.chain ?? o.chainId ?? "").trim();
  const token = String(o.token ?? o.symbol ?? "").trim();
  if (!chain || !token) return null;
  const raw = o.currentBalance ?? o.balance ?? o.amount;
  const balance =
    typeof raw === "number" && !Number.isNaN(raw)
      ? raw
      : Number.parseFloat(String(raw ?? "0").replace(/,/g, ""));
  if (Number.isNaN(balance)) return null;
  return { chain: chain.toLowerCase(), token, balance };
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: "Ethereum",
  base: "Base",
  arbitrum: "Arbitrum",
  bnb: "BNB",
};

/** Build ChainBalance[] and AggregatedAsset[] from raw inventory rows. */
export function buildBalancesFromInventory(
  rows: Array<{ chain: string; token: string; balance: number }>
): { chains: ChainBalance[]; aggregated: AggregatedAsset[] } {
  const byChain = new Map<
    string,
    { tokens: TokenBalance[]; totalUsd: number }
  >();
  const byToken = new Map<
    string,
    { total: number; byChain: Map<string, number> }
  >();

  for (const r of rows) {
    const chainKey = r.chain.toLowerCase();
    if (!byChain.has(chainKey)) {
      byChain.set(chainKey, { tokens: [], totalUsd: 0 });
    }
    const chainData = byChain.get(chainKey)!;
    const existing = chainData.tokens.find((t) => t.symbol === r.token);
    if (existing) {
      existing.amount += r.balance;
    } else {
      chainData.tokens.push({ symbol: r.token, amount: r.balance });
    }
    chainData.totalUsd += r.balance * getTokenUsdRate(r.token);

    if (!byToken.has(r.token)) {
      byToken.set(r.token, { total: 0, byChain: new Map() });
    }
    const tokenData = byToken.get(r.token)!;
    tokenData.total += r.balance;
    tokenData.byChain.set(
      chainKey,
      (tokenData.byChain.get(chainKey) ?? 0) + r.balance
    );
  }

  const chains: ChainBalance[] = Array.from(byChain.entries()).map(
    ([chainId, data]) => ({
      chainId: chainId as ChainId,
      chainName: CHAIN_DISPLAY_NAMES[chainId] ?? chainId,
      healthy: true,
      tokens: data.tokens,
      totalUsd: data.totalUsd,
    })
  );

  const aggregated: AggregatedAsset[] = Array.from(byToken.entries()).map(
    ([symbol, data]) => ({
      symbol,
      totalAmount: data.total,
      breakdown: Array.from(data.byChain.entries()).map(([chainId, amount]) => ({
        chainId: chainId as ChainId,
        amount,
        sharePercent:
          data.total > 0
            ? Math.round((amount / data.total) * 100)
            : 0,
      })),
    })
  );

  return { chains, aggregated };
}

/** Build chains and aggregated from InventoryAssetRow[] (e.g. from RTK Query). */
export function buildBalancesFromAssets(
  assets: Array<{ chain: string; token: string; balance: string }>
): { chains: ChainBalance[]; aggregated: AggregatedAsset[] } {
  const rows = assets.map((a) => ({
    chain: a.chain.toLowerCase(),
    token: a.token,
    balance: Number.parseFloat(String(a.balance).replace(/,/g, "")) || 0,
  }));
  return buildBalancesFromInventory(rows);
}

/** Fetches inventory rows from Core API only. Returns [] if Core is unavailable or returns no data. */
async function getInventoryRows(): Promise<
  Array<{ chain: string; token: string; balance: number }>
> {
  try {
    const result = await getCoreInventory({ limit: 100 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    // #region agent log
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "data-balances.ts:getInventoryRows",
        message: "getInventoryRows result",
        data: { ok: result.ok, rawLength: raw.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: ["B", "D"],
      }),
    }).catch(() => {});
    // #endregion
    return raw
      .map(parseInventoryItem)
      .filter((r): r is NonNullable<ReturnType<typeof parseInventoryItem>> => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
}

export async function getChainBalances(): Promise<ChainBalance[]> {
  try {
    const rows = await getInventoryRows();
    if (rows.length === 0) return [];
    const { chains } = buildBalancesFromInventory(rows);
    return chains;
  } catch {
    return [];
  }
}

export async function getAggregatedAssets(): Promise<AggregatedAsset[]> {
  try {
    const rows = await getInventoryRows();
    if (rows.length === 0) return [];
    const { aggregated } = buildBalancesFromInventory(rows);
    return aggregated;
  } catch {
    return [];
  }
}

/** Parse transaction item for floating amount (fromAmount or toAmount as number). */
function parseTransactionAmount(item: unknown): number {
  if (!item || typeof item !== "object") return 0;
  const o = item as Record<string, unknown>;
  const from = o.fromAmount ?? o.f_amount;
  const to = o.toAmount ?? o.t_amount;
  const num =
    typeof from === "number"
      ? from
      : typeof to === "number"
        ? to
        : Number.parseFloat(String(from ?? to ?? "0").replace(/,/g, ""));
  return Number.isNaN(num) ? 0 : num;
}

/** Parse claim item to { symbol, amount } for claimable. */
function parseClaimItem(
  item: unknown
): { symbol: string; amount: number } | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const symbol = String(o.symbol ?? o.token ?? o.currency ?? "USD").trim();
  const raw = o.amount ?? o.total ?? o.value;
  const amount =
    typeof raw === "number"
      ? raw
      : Number.parseFloat(String(raw ?? "0").replace(/,/g, ""));
  if (Number.isNaN(amount)) return null;
  return { symbol, amount };
}

/** Fetches pending/active state from Core API only. Returns EMPTY_PENDING if Core is unavailable. */
export async function getPendingState(): Promise<PendingState> {
  try {
    const [pendingRes, activeRes] = await Promise.all([
      getCoreTransactions({ status: "PENDING", limit: 100 }),
      getCoreTransactions({ status: "ACTIVE", limit: 100 }),
    ]);

    const envelopeToRows = (
      res: { ok: boolean; data: unknown }
    ): unknown[] => {
      if (!res.ok || !res.data || typeof res.data !== "object") return [];
      const d = res.data as { success?: boolean; data?: unknown[] };
      return Array.isArray(d.data) ? d.data : [];
    };

    const pendingRows = envelopeToRows(pendingRes);
    const activeRows = envelopeToRows(activeRes);
    const allRows = [...pendingRows, ...activeRows];
    // #region agent log
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "data-balances.ts:getPendingState",
        message: "getPendingState result",
        data: {
          pendingOk: pendingRes.ok,
          activeOk: activeRes.ok,
          pendingRowsLength: pendingRows.length,
          activeRowsLength: activeRows.length,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: ["B", "D"],
      }),
    }).catch(() => {});
    // #endregion
    const activeOrdersCount = allRows.length;
    const floatingAmountUsd = allRows.reduce<number>(
      (sum, item) => sum + parseTransactionAmount(item),
      0
    );
    const capacityUsedPercent = Math.min(100, activeOrdersCount * 5);

    return {
      floatingAmountUsd,
      activeOrdersCount,
      capacityUsedPercent,
    };
  } catch {
    // Core unavailable
    return EMPTY_PENDING;
  }
}

export async function getClaimableState(): Promise<ClaimableState> {
  try {
    const result = await getCoreClaims({ status: "ACTIVE", limit: 100 });
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return EMPTY_CLAIMABLE;
    }
    const d = result.data as { success?: boolean; data?: unknown[] };
    const rows = Array.isArray(d.data) ? d.data : [];
    const parsed = rows
      .map(parseClaimItem)
      .filter((r): r is { symbol: string; amount: number } => r !== null);

    const byCurrencyMap = new Map<string, number>();
    for (const { symbol, amount } of parsed) {
      const key = symbol.toUpperCase();
      byCurrencyMap.set(key, (byCurrencyMap.get(key) ?? 0) + amount);
    }
    const byCurrency = Array.from(byCurrencyMap.entries()).map(
      ([symbol, amount]) => ({ symbol, amount })
    );
    const totalUsd = byCurrency.reduce(
      (sum, c) => sum + c.amount * getTokenUsdRate(c.symbol),
      0
    );

    return { totalUsd, byCurrency };
  } catch {
    return EMPTY_CLAIMABLE;
  }
}

export async function getRecentBalanceActivity(): Promise<BalanceActivity[]> {
  return [];
}

/** Format date for table display. */
export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

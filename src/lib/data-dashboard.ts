/**
 * Dashboard KPIs and activity — real data from Core API only.
 * Volume, active orders, low liquidity, and inventory chart data.
 * Gross/net volume are aggregated in USD via token rates.
 */

import { getCoreTransactions } from "@/lib/core-api";
import { getInventoryAssets } from "@/lib/data-inventory";
import { getTokenUsdRate } from "@/lib/token-rates";
import { TransactionStatus } from "@/types/enums";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
/** Balance below this is considered low liquidity (for alert count). */
const LOW_LIQUIDITY_THRESHOLD = 1000;

export type DashboardKpis = {
  volumeDay: string;
  volumeWeek: string;
  activeOrders: number;
  lowLiquidityAlerts: number;
};

function parseAmount(s: unknown): number {
  if (typeof s === "number" && !Number.isNaN(s)) return s;
  if (typeof s === "string") {
    const n = Number.parseFloat(s.replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * KPIs from Core: transactions (volume 24h/7d, active orders) and inventory (low liquidity).
 */
export async function getDashboardKpis(): Promise<DashboardKpis> {
  const now = Date.now();
  const since24h = now - MS_24H;
  const since7d = now - MS_7D;

  let volumeDay = 0;
  let volumeWeek = 0;
  let activeOrders = 0;

  try {
    const result = await getCoreTransactions({ limit: 200, page: 1 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    // #region agent log
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "data-dashboard.ts:getDashboardKpis",
        message: "getDashboardKpis transactions",
        data: { ok: result.ok, rawLength: raw.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: ["B", "D"],
      }),
    }).catch(() => {});
    // #endregion
    if (raw.length > 0) {
      const items = raw as Array<Record<string, unknown>>;
      for (const o of items) {
        const status = String(o.status ?? "");
        const createdAt = o.createdAt instanceof Date
          ? o.createdAt.getTime()
          : new Date(String(o.createdAt ?? 0)).getTime();
        const amount = parseAmount(o.fromAmount ?? o.f_amount ?? 0);
        const symbol = String(
          o.fromToken ?? o.f_token ?? o.toToken ?? o.t_token ?? "USDC"
        ).trim();
        const amountUsd = amount * getTokenUsdRate(symbol);

        if (status === TransactionStatus.COMPLETED) {
          if (createdAt >= since24h) volumeDay += amountUsd;
          if (createdAt >= since7d) volumeWeek += amountUsd;
        }
        if (
          status === TransactionStatus.PENDING ||
          status === TransactionStatus.ACTIVE
        ) {
          activeOrders += 1;
        }
      }
    }
  } catch {
    // leave volumes and activeOrders at 0
  }

  let lowLiquidityAlerts = 0;
  try {
    const assets = await getInventoryAssets();
    lowLiquidityAlerts = assets.filter((a) => {
      const b = parseAmount(a.balance);
      return b > 0 && b < LOW_LIQUIDITY_THRESHOLD;
    }).length;
  } catch {
    // leave at 0
  }

  return {
    volumeDay: volumeDay.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    volumeWeek: volumeWeek.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }),
    activeOrders,
    lowLiquidityAlerts,
  };
}

export type ChartFilterView = "all-tokens" | "by-chain" | "by-token-per-chain" | "all-chains";

export type InventoryChartSeries = {
  name: string;
  value: number;
  chain?: string;
  token?: string;
};

/**
 * Build chart series from Core inventory for dashboard graphs.
 * - all-tokens: aggregate balance by token (across chains)
 * - by-chain: aggregate balance by chain
 * - by-token-per-chain: each series = token on chain (e.g. "USDC on BASE")
 * - all-chains: one row per chain with total
 * When useUsd is true, values are converted to USD via getTokenUsdRate(token).
 */
export function buildInventoryChartData(
  assets: Array<{ chain: string; token: string; balance: string }>,
  view: ChartFilterView,
  useUsd = false
): InventoryChartSeries[] {
  const parse = (s: string) => {
    const n = Number.parseFloat(s.replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
  };

  const toValue = (a: { chain: string; token: string; balance: string }) => {
    const amount = parse(a.balance);
    return useUsd ? amount * getTokenUsdRate(a.token) : amount;
  };

  if (view === "all-tokens") {
    const byToken: Record<string, number> = {};
    for (const a of assets) {
      byToken[a.token] = (byToken[a.token] ?? 0) + toValue(a);
    }
    return Object.entries(byToken).map(([name, value]) => ({ name, value }));
  }

  if (view === "by-chain") {
    const byChain: Record<string, number> = {};
    for (const a of assets) {
      byChain[a.chain] = (byChain[a.chain] ?? 0) + toValue(a);
    }
    return Object.entries(byChain).map(([name, value]) => ({ name, value }));
  }

  if (view === "by-token-per-chain") {
    return assets.map((a) => ({
      name: `${a.token} on ${a.chain}`,
      value: toValue(a),
      chain: a.chain,
      token: a.token,
    }));
  }

  // all-chains: same as by-chain but explicit label
  const byChain: Record<string, number> = {};
  for (const a of assets) {
    byChain[a.chain] = (byChain[a.chain] ?? 0) + toValue(a);
  }
  return Object.entries(byChain).map(([name, value]) => ({ name, value }));
}

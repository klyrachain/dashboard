/**
 * Dashboard KPIs and activity — real data from Core API only.
 * Volume, active orders, low liquidity, and inventory chart data.
 */

import { getCoreTransactions } from "@/lib/core-api";
import { getInventoryAssets } from "@/lib/data-inventory";
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
    if (result.ok && result.data.success && Array.isArray(result.data.data)) {
      const items = result.data.data as Array<Record<string, unknown>>;
      for (const o of items) {
        const status = String(o.status ?? "");
        const createdAt = o.createdAt instanceof Date
          ? o.createdAt.getTime()
          : new Date(String(o.createdAt ?? 0)).getTime();
        const amount = parseAmount(o.fromAmount ?? o.f_amount ?? 0);

        if (status === TransactionStatus.COMPLETED) {
          if (createdAt >= since24h) volumeDay += amount;
          if (createdAt >= since7d) volumeWeek += amount;
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
 */
export function buildInventoryChartData(
  assets: Array<{ chain: string; token: string; balance: string }>,
  view: ChartFilterView
): InventoryChartSeries[] {
  const parse = (s: string) => {
    const n = Number.parseFloat(s.replace(/,/g, ""));
    return Number.isNaN(n) ? 0 : n;
  };

  if (view === "all-tokens") {
    const byToken: Record<string, number> = {};
    for (const a of assets) {
      byToken[a.token] = (byToken[a.token] ?? 0) + parse(a.balance);
    }
    return Object.entries(byToken).map(([name, value]) => ({ name, value }));
  }

  if (view === "by-chain") {
    const byChain: Record<string, number> = {};
    for (const a of assets) {
      byChain[a.chain] = (byChain[a.chain] ?? 0) + parse(a.balance);
    }
    return Object.entries(byChain).map(([name, value]) => ({ name, value }));
  }

  if (view === "by-token-per-chain") {
    return assets.map((a) => ({
      name: `${a.token} on ${a.chain}`,
      value: parse(a.balance),
      chain: a.chain,
      token: a.token,
    }));
  }

  // all-chains: same as by-chain but explicit label
  const byChain: Record<string, number> = {};
  for (const a of assets) {
    byChain[a.chain] = (byChain[a.chain] ?? 0) + parse(a.balance);
  }
  return Object.entries(byChain).map(([name, value]) => ({ name, value }));
}

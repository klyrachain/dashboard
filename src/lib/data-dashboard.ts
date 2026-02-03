/**
 * Dashboard KPIs and activity — real data from Core API only.
 * Volume, active orders, low liquidity, and inventory chart data.
 * Gross/net volume are aggregated in USD via token rates.
 */

import { getSessionToken } from "@/lib/auth";
import { getCoreTransactions } from "@/lib/core-api";
import { getInventoryAssets } from "@/lib/data-inventory";
import { getTokenUsdRate } from "@/lib/token-rates";
import { TransactionStatus } from "@/types/enums";

const MS_24H = 24 * 60 * 60 * 1000;
const MS_7D = 7 * MS_24H;
const MS_30D = 30 * MS_24H;
/** Balance below this is considered low liquidity (for alert count). */
const LOW_LIQUIDITY_THRESHOLD = 1000;

/** Chart point for gross/net volume area charts (date = axis, value = USD, label = tooltip). */
export type VolumeChartPoint = {
  date: string;
  value: number;
  label: string;
};

export type VolumeDateRange = "24h" | "7d" | "30d";
export type VolumeGranularity = "hourly" | "daily";

export type VolumeChartResult = {
  grossSeries: VolumeChartPoint[];
  netSeries: VolumeChartPoint[];
  feeSeries: VolumeChartPoint[];
  grossTotal: number;
  netTotal: number;
  feeTotal: number;
  updatedAt: Date | null;
  grossPrevious: { value: number; changePercent: number };
  netPrevious: { value: number; changePercent: number };
  feePrevious: { value: number; changePercent: number };
};

export type DashboardKpis = {
  volumeDay: string;
  volumeWeek: string;
  /** Timestamp of the latest transaction used for volume; used for "Updated X ago". */
  volumeUpdatedAt: Date | null;
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
  let volumeUpdatedAt: Date | null = null;

  try {
    const result = await getCoreTransactions({ limit: 200, page: 1 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];

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
          if (
            !volumeUpdatedAt ||
            createdAt > volumeUpdatedAt.getTime()
          ) {
            volumeUpdatedAt = new Date(createdAt);
          }
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
    volumeUpdatedAt,
    activeOrders,
    lowLiquidityAlerts,
  };
}

/**
 * Volume chart data from Core transactions for a given range and granularity.
 * - Gross = total transaction value (fromAmount in USD) for completed tx.
 * - Fees = sum of stored transaction fee in USD (only when fee is set on the transaction; no fallback).
 * - Net = Gross − Fees (volume after platform fees).
 * Previous period = same length immediately before current window (for % change).
 */
export async function getVolumeChartDataFromCore(
  range: VolumeDateRange,
  granularity: VolumeGranularity
): Promise<VolumeChartResult> {
  const now = Date.now();
  const rangeMs =
    range === "24h" ? MS_24H : range === "7d" ? MS_7D : MS_30D;
  const since = now - rangeMs;

  // 24h + daily = 1 bucket; use hourly for 24h when user picks daily for consistency with selector
  const useHourly =
    granularity === "hourly" || range === "24h";
  const bucketMs = useHourly ? 60 * 60 * 1000 : MS_24H;
  const bucketCount = useHourly
    ? Math.round(rangeMs / bucketMs)
    : Math.round(rangeMs / MS_24H);
  const bucketKeys: number[] = [];
  for (let i = 0; i < bucketCount; i++) {
    bucketKeys.push(since + i * bucketMs);
  }

  const grossByBucket: Record<number, number> = {};
  const netByBucket: Record<number, number> = {};
  const feeByBucket: Record<number, number> = {};
  bucketKeys.forEach((k) => {
    grossByBucket[k] = 0;
    netByBucket[k] = 0;
    feeByBucket[k] = 0;
  });

  let grossTotal = 0;
  let netTotal = 0;
  let feeTotal = 0;
  let volumeUpdatedAt: Date | null = null;

  // Previous period (same length before current)
  const previousSince = since - rangeMs;
  let grossPreviousTotal = 0;
  let netPreviousTotal = 0;
  let feePreviousTotal = 0;

  try {
    const token = await getSessionToken();
    const result = await getCoreTransactions({ limit: 1000, page: 1 }, token ?? undefined);
    const raw =
      result.ok &&
        result.data &&
        typeof result.data === "object" &&
        Array.isArray((result.data as { data?: unknown[] }).data)
        ? (result.data as { data: unknown[] }).data
        : [];

    const items = raw as Array<Record<string, unknown>>;
    for (const o of items) {
      const status = String(o.status ?? "");
      if (status !== TransactionStatus.COMPLETED) continue;

      const createdAt =
        o.createdAt instanceof Date
          ? o.createdAt.getTime()
          : new Date(String(o.createdAt ?? 0)).getTime();

      const fromAmount = parseAmount(o.fromAmount ?? o.f_amount ?? 0);
      const fromSymbol = String(
        o.fromToken ?? o.f_token ?? o.toToken ?? o.t_token ?? "USDC"
      ).trim();
      const grossUsd = fromAmount * getTokenUsdRate(fromSymbol);

      // Fee: use stored transaction fee from API as-is (backend handles price conversion).
      const feeRaw = o.fee;
      const feeUsd =
        feeRaw != null && String(feeRaw).trim() !== ""
          ? parseAmount(feeRaw)
          : 0;

      // Net = Gross − Fees (volume after platform fees)
      const netUsd = Math.max(0, grossUsd - feeUsd);

      if (createdAt >= since && createdAt <= now) {
        const bucketKey = useHourly
          ? Math.floor(createdAt / bucketMs) * bucketMs
          : new Date(createdAt).setUTCHours(0, 0, 0, 0);
        if (grossByBucket[bucketKey] !== undefined) {
          grossByBucket[bucketKey] += grossUsd;
          netByBucket[bucketKey] += netUsd;
          feeByBucket[bucketKey] += feeUsd;
        }
        grossTotal += grossUsd;
        netTotal += netUsd;
        feeTotal += feeUsd;
        if (
          !volumeUpdatedAt ||
          createdAt > volumeUpdatedAt.getTime()
        ) {
          volumeUpdatedAt = new Date(createdAt);
        }
      } else if (createdAt >= previousSince && createdAt < since) {
        grossPreviousTotal += grossUsd;
        netPreviousTotal += netUsd;
        feePreviousTotal += feeUsd;
      }
    }
  } catch {
    // return zeros
  }

  const formatHour = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };
  const formatDay = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };
  const formatLabel = (ts: number, value: number) => {
    const d = new Date(ts);
    const dateStr = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    return `${dateStr}: $${value.toFixed(2)}`;
  };

  const grossSeries: VolumeChartPoint[] = bucketKeys.map((ts) => {
    const value = grossByBucket[ts] ?? 0;
    return {
      date: useHourly ? formatHour(ts) : formatDay(ts),
      value,
      label: formatLabel(ts, value),
    };
  });

  const netSeries: VolumeChartPoint[] = bucketKeys.map((ts) => {
    const value = netByBucket[ts] ?? 0;
    return {
      date: useHourly ? formatHour(ts) : formatDay(ts),
      value,
      label: formatLabel(ts, value),
    };
  });

  const feeSeries: VolumeChartPoint[] = bucketKeys.map((ts) => {
    const value = feeByBucket[ts] ?? 0;
    return {
      date: useHourly ? formatHour(ts) : formatDay(ts),
      value,
      label: formatLabel(ts, value),
    };
  });

  const prevChange = (current: number, previous: number) =>
    previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;

  return {
    grossSeries,
    netSeries,
    feeSeries,
    grossTotal,
    netTotal,
    feeTotal,
    updatedAt: volumeUpdatedAt,
    grossPrevious: {
      value: grossPreviousTotal,
      changePercent: prevChange(grossTotal, grossPreviousTotal),
    },
    netPrevious: {
      value: netPreviousTotal,
      changePercent: prevChange(netTotal, netPreviousTotal),
    },
    feePrevious: {
      value: feePreviousTotal,
      changePercent: prevChange(feeTotal, feePreviousTotal),
    },
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

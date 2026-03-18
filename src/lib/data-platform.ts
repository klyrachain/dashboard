/**
 * Platform API — GET /api/platform/overview (analytics: gross volume, realized revenue, pairs).
 * Optional startDate / endDate (YYYY-MM-DD) for date range; inclusive UTC.
 * @see Platform API — Frontend Integration Report
 */

import { getCorePlatformOverview } from "@/lib/core-api";
import { getSessionToken } from "@/lib/auth";

/** Top-level overview metrics. */
export type PlatformOverviewSummary = {
  /** Total volume in USD (string for precision). */
  grossVolumeUsd: string;
  /** Realized revenue in USD (feeInUsd or fee × USD price at tx time). */
  realizedRevenueUsd: string;
  /** Total transaction count in range. */
  totalTxCount: number;
};

/** Fee amount and currency for a pair. */
export type PlatformPairFees = {
  amount: string;
  currency: string;
};

/** Per-pair analytics (ONRAMP / OFF_RAMP / SWAP). */
export type PlatformOverviewPair = {
  symbol: string;
  type: "ONRAMP" | "OFF_RAMP" | "SWAP";
  volumeUsd: string;
  fees: PlatformPairFees;
  realizedRevenueUsd: string;
  count: number;
};

export type PlatformOverview = {
  overview: PlatformOverviewSummary;
  pairs: PlatformOverviewPair[];
};

export type PlatformOverviewResult = { ok: boolean; data: PlatformOverview | null; error?: string };

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseOverview(raw: unknown): PlatformOverviewSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    grossVolumeUsd: str(o.grossVolumeUsd ?? ""),
    realizedRevenueUsd: str(o.realizedRevenueUsd ?? ""),
    totalTxCount: typeof o.totalTxCount === "number" ? o.totalTxCount : 0,
  };
}

function parsePairFees(raw: unknown): PlatformPairFees {
  if (!raw || typeof raw !== "object") {
    return { amount: "", currency: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    amount: str(o.amount ?? ""),
    currency: str(o.currency ?? ""),
  };
}

function parsePair(raw: unknown): PlatformOverviewPair | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const type = str(o.type ?? "");
  if (type !== "ONRAMP" && type !== "OFF_RAMP" && type !== "SWAP") return null;
  return {
    symbol: str(o.symbol ?? ""),
    type: type as PlatformOverviewPair["type"],
    volumeUsd: str(o.volumeUsd ?? ""),
    fees: parsePairFees(o.fees),
    realizedRevenueUsd: str(o.realizedRevenueUsd ?? ""),
    count: typeof o.count === "number" ? o.count : 0,
  };
}

function parsePlatformPayload(raw: unknown): PlatformOverview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const overview = parseOverview(o.overview);
  if (!overview) return null;
  const pairsRaw = Array.isArray(o.pairs) ? o.pairs : [];
  const pairs = pairsRaw.map(parsePair).filter((p): p is PlatformOverviewPair => p !== null);
  return { overview, pairs };
}

export type GetPlatformOverviewParams = {
  /** Start date inclusive (YYYY-MM-DD) UTC. */
  startDate?: string;
  /** End date inclusive (YYYY-MM-DD) UTC. */
  endDate?: string;
};

export async function getPlatformOverview(
  params?: GetPlatformOverviewParams
): Promise<PlatformOverviewResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCorePlatformOverview(
      {
        startDate: params?.startDate,
        endDate: params?.endDate,
      },
      token ?? undefined
    );
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 403
            ? "Platform overview is for platform keys only."
            : "Request failed";
      return { ok: false, data: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data : null;
    const overview = payload ? parsePlatformPayload(payload) : null;
    return { ok: !!overview, data: overview, error: overview ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

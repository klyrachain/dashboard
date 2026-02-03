/**
 * Platform API — platform-wide dashboard (all transactions, all fees).
 * Distinct from Connect (B2B) which is business/partner-scoped.
 * @see Platform API — Frontend Integration Report
 */

import { getCorePlatformOverview } from "@/lib/core-api";
import { getSessionToken } from "@/lib/auth";

/** Accumulated fee totals by token/currency. Keys = token symbol (e.g. GHS, USDC); values = sum of Transaction.fee for that f_token. */
export type PlatformFeesByCurrency = Record<string, string>;

export type PlatformOverview = {
  /** Accumulated fee totals by token from all completed transactions. */
  feesByCurrency: PlatformFeesByCurrency;
  /** Sum of (fee × rate) per transaction in quote units. */
  totalConverted: number;
  /** Total count of transactions with status COMPLETED. */
  completedTransactionCount: number;
  /** Count of completed transactions that have a non-null fee. */
  completedWithFeeCount: number;
};

export type PlatformOverviewResult = { ok: boolean; data: PlatformOverview | null; error?: string };

function parsePlatformOverview(raw: unknown): PlatformOverview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const feesByCurrency: PlatformFeesByCurrency = {};
  if (o.feesByCurrency && typeof o.feesByCurrency === "object" && !Array.isArray(o.feesByCurrency)) {
    for (const [key, val] of Object.entries(o.feesByCurrency)) {
      const k = String(key).trim();
      if (k) feesByCurrency[k] = val != null ? String(val).trim() : "";
    }
  }
  const totalConverted = typeof o.totalConverted === "number" ? o.totalConverted : 0;
  const completedTransactionCount =
    typeof o.completedTransactionCount === "number" ? o.completedTransactionCount : 0;
  const completedWithFeeCount =
    typeof o.completedWithFeeCount === "number" ? o.completedWithFeeCount : 0;
  return {
    feesByCurrency,
    totalConverted,
    completedTransactionCount,
    completedWithFeeCount,
  };
}

export async function getPlatformOverview(): Promise<PlatformOverviewResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCorePlatformOverview(token ?? undefined);
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
    const overview = payload ? parsePlatformOverview(payload) : null;
    return { ok: !!overview, data: overview, error: overview ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

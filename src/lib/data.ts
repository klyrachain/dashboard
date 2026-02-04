/**
 * Recent transactions — Core API only (GET /api/transactions).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getSessionToken } from "@/lib/auth";
import { getCoreTransactions } from "@/lib/core-api";

export type RecentTransaction = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  /** Fee in token units (legacy). Prefer feeInUsd for USD display. */
  fee: string | null;
  /** Fee value in USD (set when status = COMPLETED). */
  feeInUsd: string | null;
  createdAt: Date;
};

function strFee(v: unknown): string | null {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  return s || null;
}

/** Normalize Core API transaction to RecentTransaction (webhook-sourced data). */
function coreItemToRecent(item: unknown): RecentTransaction | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const createdAt = o.createdAt instanceof Date ? o.createdAt : new Date(String(o.createdAt ?? ""));
  return {
    id,
    type: String(o.type ?? ""),
    status: String(o.status ?? ""),
    fromAmount: String(o.fromAmount ?? o.f_amount ?? ""),
    toAmount: String(o.toAmount ?? o.t_amount ?? ""),
    fee: strFee(o.fee),
    feeInUsd: o.feeInUsd != null ? String(o.feeInUsd).trim() || null : null,
    createdAt,
  };
}

/** Recent activity from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getRecentTransactions(
  limit: number
): Promise<RecentTransaction[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreTransactions({ limit, page: 1 }, token ?? undefined);
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw
      .map((item) => coreItemToRecent(item))
      .filter((r): r is RecentTransaction => r !== null)
      .slice(0, limit);
  } catch {
    // Core unavailable
  }
  return [];
}

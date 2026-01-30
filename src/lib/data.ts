/**
 * Recent transactions — Core API only (GET /api/transactions).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getCoreTransactions } from "@/lib/core-api";

export type RecentTransaction = {
  id: string;
  type: string;
  status: string;
  fromAmount: string;
  toAmount: string;
  createdAt: Date;
};

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
    createdAt,
  };
}

/** Recent activity from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getRecentTransactions(
  limit: number
): Promise<RecentTransaction[]> {
  try {
    const result = await getCoreTransactions({ limit, page: 1 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    // #region agent log
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "data.ts:getRecentTransactions",
        message: "getRecentTransactions result",
        data: { ok: result.ok, rawLength: raw.length },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: ["B", "D"],
      }),
    }).catch(() => {});
    // #endregion
    return raw
      .map((item) => coreItemToRecent(item))
      .filter((r): r is RecentTransaction => r !== null)
      .slice(0, limit);
  } catch {
    // Core unavailable
  }
  return [];
}

import { prisma } from "@/lib/prisma";
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

/**
 * Recent activity from Core (webhook-fetched data). Mandatory: uses Core API first.
 */
export async function getRecentTransactions(
  limit: number
): Promise<RecentTransaction[]> {
  try {
    const result = await getCoreTransactions({ limit, page: 1 });
    if (result.ok && result.data.success && Array.isArray(result.data.data)) {
      const rows = result.data.data
        .map(coreItemToRecent)
        .filter((r): r is RecentTransaction => r !== null)
        .slice(0, limit);
      if (rows.length > 0) return rows;
    }
  } catch {
    // fall through to Prisma
  }
  try {
    const rows = await prisma.transaction.findMany({
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        type: true,
        status: true,
        fromAmount: true,
        toAmount: true,
        createdAt: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}

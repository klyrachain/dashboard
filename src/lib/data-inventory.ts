import { prisma } from "@/lib/prisma";
import { getCoreInventory, getCoreInventoryHistory } from "@/lib/core-api";

export type InventoryAssetRow = {
  id: string;
  chain: string;
  token: string;
  balance: string;
  updatedAt: Date;
};

/** Normalize Core API inventory item to InventoryAssetRow. Supports symbol/currentBalance (Core) or token/balance. */
export function coreAssetToRow(item: unknown): InventoryAssetRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const chain = String(o.chain ?? "").trim();
  const token = String(o.symbol ?? o.token ?? "").trim();
  const rawBalance = o.currentBalance ?? o.balance ?? "";
  const balance =
    typeof rawBalance === "number"
      ? String(rawBalance)
      : String(rawBalance).trim();
  const updatedAt =
    o.updatedAt instanceof Date
      ? o.updatedAt
      : new Date(String(o.updatedAt ?? ""));
  if (!chain || !token) return null;
  return { id, chain, token, balance, updatedAt };
}

/** Normalize Core API envelope { success, data } to InventoryAssetRow[]. */
export function normalizeInventoryFromApi(envelope: unknown): InventoryAssetRow[] {
  if (!envelope || typeof envelope !== "object") return [];
  const o = envelope as { success?: boolean; data?: unknown[] };
  if (o.success !== true || !Array.isArray(o.data)) return [];
  return o.data
    .map(coreAssetToRow)
    .filter((r): r is InventoryAssetRow => r !== null);
}

export type InventoryHistoryPoint = {
  date: string;
  balance: number;
  label: string;
};

export async function getInventoryAssets(): Promise<InventoryAssetRow[]> {
  try {
    const result = await getCoreInventory({ limit: 100 });
    if (result.ok && result.data.success && Array.isArray(result.data.data)) {
      const rows = result.data.data
        .map(coreAssetToRow)
        .filter((r): r is InventoryAssetRow => r !== null);
      if (rows.length > 0) return rows;
    }
  } catch {
    // fall through to Prisma
  }
  try {
    const rows = await prisma.inventoryAsset.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        chain: true,
        token: true,
        balance: true,
        updatedAt: true,
      },
    });
    return rows;
  } catch {
    return [];
  }
}

/** Normalize Core inventory history item to InventoryHistoryPoint. */
function coreHistoryToPoint(
  item: unknown,
  label: string
): InventoryHistoryPoint | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const balance = Number(o.balance ?? 0);
  const date =
    o.recordedAt instanceof Date
      ? o.recordedAt.toISOString().slice(0, 10)
      : o.recordedAt != null
        ? String(o.recordedAt).slice(0, 10)
        : "";
  if (!date) return null;
  return { date, balance, label };
}

/**
 * Fetch inventory history for a specific asset (Core API or Prisma).
 * Use this when you already have assets to avoid double-fetching.
 */
export async function getInventoryHistoryForAsset(
  assetId: string,
  label: string
): Promise<InventoryHistoryPoint[]> {
  try {
    const result = await getCoreInventoryHistory(assetId, { limit: 30 });
    if (
      result.ok &&
      result.data.success &&
      Array.isArray(result.data.data)
    ) {
      const points = result.data.data
        .map((item) => coreHistoryToPoint(item, label))
        .filter((p): p is InventoryHistoryPoint => p !== null)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (points.length > 0) return points;
    }
  } catch {
    // fall through
  }
  try {
    const rows = await prisma.inventoryHistory.findMany({
      where: { assetId },
      take: 30,
      orderBy: { recordedAt: "asc" },
      select: { balance: true, recordedAt: true },
    });
    return rows.map((r) => ({
      date: r.recordedAt.toISOString().slice(0, 10),
      balance: Number(r.balance),
      label,
    }));
  } catch {
    return [];
  }
}

export async function getInventoryHistory(): Promise<InventoryHistoryPoint[]> {
  const assets = await getInventoryAssets();
  if (assets.length === 0) return [];
  const first = assets[0];
  return getInventoryHistoryForAsset(
    first.id,
    `${first.token} on ${first.chain}`
  );
}

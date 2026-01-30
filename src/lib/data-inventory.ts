/**
 * Inventory data — Core API only (GET /api/inventory, GET /api/inventory/:id/history).
 * No database fallback. Returns [] if Core is unavailable.
 */
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

/** Fetches inventory assets from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getInventoryAssets(): Promise<InventoryAssetRow[]> {
  try {
    const result = await getCoreInventory({ limit: 100 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw.map((item) => coreAssetToRow(item)).filter((r): r is InventoryAssetRow => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
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

/** Fetches inventory history for a specific asset from Core API only. Returns [] if Core is unavailable or returns no data. */
export async function getInventoryHistoryForAsset(
  assetId: string,
  label: string
): Promise<InventoryHistoryPoint[]> {
  try {
    const result = await getCoreInventoryHistory(assetId, { limit: 30 });
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw
      .map((item) => coreHistoryToPoint(item, label))
      .filter((p): p is InventoryHistoryPoint => p !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    // Core unavailable
  }
  return [];
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

/**
 * Inventory data — Core API only (GET /api/inventory, GET /api/inventory/history, GET /api/inventory/:id/history).
 * No database fallback. Returns [] if Core is unavailable.
 */
import {
  getCoreInventory,
  getCoreInventoryHistory,
  getCoreInventoryHistoryList,
} from "@/lib/core-api";

export type InventoryAssetRow = {
  id: string;
  chain: string;
  token: string;
  balance: string;
  /** ISO date string (serializable for Redux state). */
  updatedAt: string;
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
      ? o.updatedAt.toISOString()
      : typeof o.updatedAt === "string"
        ? o.updatedAt
        : new Date(String(o.updatedAt ?? "")).toISOString();
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

/** One row from GET /api/inventory/history (Decimal fields as strings). */
export type InventoryHistoryRow = {
  id: string;
  createdAt: Date;
  assetId: string;
  type: string;
  amount: string;
  quantity: string;
  initialPurchasePrice: string;
  providerQuotePrice: string;
  asset: { id: string; chain: string; symbol: string };
};

export type InventoryHistoryListResult = {
  items: InventoryHistoryRow[];
  meta: { page: number; limit: number; total: number };
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  const s = str(v);
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date(0) : new Date(t);
}

/** Normalize Core API inventory/history item to InventoryHistoryRow. */
function coreHistoryItemToRow(item: unknown): InventoryHistoryRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const asset = o.asset as Record<string, unknown> | undefined;
  return {
    id,
    createdAt: parseDate(o.createdAt),
    assetId: str(o.assetId),
    type: str(o.type),
    amount: str(o.amount ?? ""),
    quantity: str(o.quantity ?? ""),
    initialPurchasePrice: str(o.initialPurchasePrice ?? ""),
    providerQuotePrice: str(o.providerQuotePrice ?? ""),
    asset: {
      id: asset ? str(asset.id) : "",
      chain: asset ? str(asset.chain) : "",
      symbol: asset ? str(asset.symbol) : "",
    },
  };
}

/**
 * Fetches inventory history list from Core GET /api/inventory/history.
 * Optional filters: assetId, chain. Pagination: page, limit (default 20, max 100).
 */
export async function getInventoryHistoryList(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
}): Promise<InventoryHistoryListResult> {
  const defaultMeta = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    total: 0,
  };
  try {
    const result = await getCoreInventoryHistoryList({
      page: params?.page,
      limit: params?.limit,
      assetId: params?.assetId,
      chain: params?.chain,
    });
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return { items: [], meta: defaultMeta };
    }
    const envelope = result.data as {
      success?: boolean;
      data?: unknown[];
      meta?: { page: number; limit: number; total: number };
    };
    if (!envelope.success || !Array.isArray(envelope.data)) {
      return { items: [], meta: defaultMeta };
    }
    const items = envelope.data
      .map(coreHistoryItemToRow)
      .filter((r): r is InventoryHistoryRow => r !== null);
    const meta = envelope.meta ?? {
      page: defaultMeta.page,
      limit: defaultMeta.limit,
      total: items.length,
    };
    return { items, meta };
  } catch {
    return { items: [], meta: defaultMeta };
  }
}

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

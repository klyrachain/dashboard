/**
 * Inventory data — Core API only (GET /api/inventory, GET /api/inventory/history, GET /api/inventory/:id/history).
 * No database fallback. Returns [] if Core is unavailable.
 */
import { getSessionToken } from "@/lib/auth";
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
  /** Optional fields returned by Core (list or single asset). */
  chainId?: number;
  address?: string;
  tokenAddress?: string;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number | undefined {
  if (v == null) return undefined;
  const n = typeof v === "number" && !Number.isNaN(v) ? v : parseInt(String(v), 10);
  return Number.isNaN(n) ? undefined : n;
}

/** Normalize Core API inventory item to InventoryAssetRow. Supports symbol/currentBalance (Core) or token/balance. */
export function coreAssetToRow(item: unknown): InventoryAssetRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const chain = str(o.chain);
  const token = str(o.symbol ?? o.token);
  const rawBalance = o.currentBalance ?? o.balance ?? "";
  const balance =
    typeof rawBalance === "number"
      ? String(rawBalance)
      : str(rawBalance);
  const updatedAt =
    o.updatedAt instanceof Date
      ? o.updatedAt.toISOString()
      : typeof o.updatedAt === "string"
        ? o.updatedAt
        : new Date(str(o.updatedAt)).toISOString();
  if (!chain || !token) return null;
  const row: InventoryAssetRow = { id, chain, token, balance, updatedAt };
  const chainId = num(o.chainId);
  if (chainId !== undefined) row.chainId = chainId;
  const address = str(o.address);
  if (address) row.address = address;
  const tokenAddress = str(o.tokenAddress);
  if (tokenAddress) row.tokenAddress = tokenAddress;
  return row;
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

/** Ledger entry from GET /api/inventory/history or GET /api/inventory/:id/history (USD-only). */
export type InventoryLedgerEntry = {
  id: string;
  createdAt: Date;
  assetId: string;
  type: "ACQUIRED" | "DISPOSED" | "REBALANCE";
  quantity: string;
  pricePerTokenUsd: string;
  totalValueUsd: string;
  referenceId: string;
  counterparty: string | null;
  /** Optional when API includes asset in response. */
  asset?: { id: string; chain: string; symbol: string };
};

export type InventoryLedgerListResult = {
  items: InventoryLedgerEntry[];
  meta: { page: number; limit: number; total: number };
};

// function str(v: unknown): string {
//   if (v == null) return "";
//   return String(v).trim();
// }

function parseDate(v: unknown): Date {
  if (v instanceof Date) return v;
  const s = str(v);
  const t = Date.parse(s);
  return Number.isNaN(t) ? new Date(0) : new Date(t);
}

function mapLedgerType(raw: string): InventoryLedgerEntry["type"] {
  const t = raw.toUpperCase();
  if (t === "ACQUIRED" || t === "DISPOSED" || t === "REBALANCE") return t;
  if (t === "PURCHASE" || t === "ACQUIRE") return "ACQUIRED";
  if (t === "SALE" || t === "SELL") return "DISPOSED";
  return "REBALANCE";
}

/** Normalize Core API inventory/history item to InventoryLedgerEntry. */
function coreLedgerItemToRow(item: unknown): InventoryLedgerEntry | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const asset = o.asset as Record<string, unknown> | undefined;
  const entry: InventoryLedgerEntry = {
    id,
    createdAt: parseDate(o.createdAt),
    assetId: str(o.assetId),
    type: mapLedgerType(str(o.type)),
    quantity: str(o.quantity ?? ""),
    pricePerTokenUsd: str(o.pricePerTokenUsd ?? ""),
    totalValueUsd: str(o.totalValueUsd ?? ""),
    referenceId: str(o.referenceId ?? ""),
    counterparty: o.counterparty != null ? str(o.counterparty) : null,
  };
  if (asset && (asset.id || asset.chain || asset.symbol)) {
    entry.asset = {
      id: asset ? str(asset.id) : "",
      chain: asset ? str(asset.chain) : "",
      symbol: asset ? str(asset.symbol ?? asset.token) : "",
    };
  }
  return entry;
}

/**
 * Fetches inventory ledger list from Core GET /api/inventory/history.
 * Optional filters: assetId, chain. Pagination: page, limit (default 20, max 100).
 */
export async function getInventoryHistoryList(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
}): Promise<InventoryLedgerListResult> {
  const defaultMeta = {
    page: params?.page ?? 1,
    limit: params?.limit ?? 20,
    total: 0,
  };
  try {
    const token = await getSessionToken();
    const result = await getCoreInventoryHistoryList(
      {
        page: params?.page,
        limit: params?.limit,
        assetId: params?.assetId,
        chain: params?.chain,
      },
      token ?? undefined
    );
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
      .map(coreLedgerItemToRow)
      .filter((r): r is InventoryLedgerEntry => r !== null);
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
    const token = await getSessionToken();
    const result = await getCoreInventory({ limit: 100 }, token ?? undefined);
    const raw = result.ok && result.data && typeof result.data === "object" && Array.isArray((result.data as { data?: unknown[] }).data)
      ? (result.data as { data: unknown[] }).data
      : [];
    return raw.map((item) => coreAssetToRow(item)).filter((r): r is InventoryAssetRow => r !== null);
  } catch {
    // Core unavailable
  }
  return [];
}

/** Build balance-over-time points from ledger entries (running sum of quantity). */
function ledgerEntriesToPoints(
  entries: InventoryLedgerEntry[],
  label: string
): InventoryHistoryPoint[] {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  let running = 0;
  const points: InventoryHistoryPoint[] = [];
  for (const e of sorted) {
    const q = Number.parseFloat(e.quantity);
    const n = Number.isFinite(q) ? q : 0;
    running += n;
    const date = e.createdAt instanceof Date
      ? e.createdAt.toISOString().slice(0, 10)
      : String(e.createdAt).slice(0, 10);
    if (date) points.push({ date, balance: running, label });
  }
  return points;
}

/** Fetches inventory ledger for a specific asset and returns balance-over-time points for charts. */
export async function getInventoryHistoryForAsset(
  assetId: string,
  label: string
): Promise<InventoryHistoryPoint[]> {
  try {
    const token = await getSessionToken();
    const result = await getCoreInventoryHistory(assetId, { limit: 100 }, token ?? undefined);
    const envelope = result.ok && result.data && typeof result.data === "object"
      ? (result.data as { success?: boolean; data?: unknown[] })
      : null;
    const raw = envelope?.success && Array.isArray(envelope.data) ? envelope.data : [];
    const entries = raw
      .map(coreLedgerItemToRow)
      .filter((e): e is InventoryLedgerEntry => e !== null);
    return ledgerEntriesToPoints(entries, label);
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

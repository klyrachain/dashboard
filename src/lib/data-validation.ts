/**
 * Failed Order Validation — types and normalizers for Core API responses.
 * @see API report: GET /api/validation/failed, /recent, /report
 */

import {
  getCoreValidationFailed,
  getCoreValidationFailedReport,
} from "@/lib/core-api";

export type FailedValidationPayload = {
  action?: string;
  f_chain?: string;
  t_chain?: string;
  f_token?: string;
  t_token?: string;
  f_amount?: number;
  t_amount?: number;
  f_provider?: string;
  t_provider?: string;
  [key: string]: unknown;
};

export type FailedValidationRow = {
  id: string;
  createdAt: string;
  reason: string;
  code: string;
  payload: FailedValidationPayload;
  requestId: string | null;
};

export type RecentFailedItem = {
  at: string;
  code: string;
  error: string;
  payload: FailedValidationPayload;
};

export type FailedValidationReport = {
  total: number;
  last24h: number;
  last7d: number;
  byCode: Record<string, number>;
  daily: Array<{ date: string; count: number }>;
  since: string;
  generatedAt: string;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function num(v: unknown): number {
  if (v == null) return 0;
  const n = typeof v === "number" && !Number.isNaN(v) ? v : Number(v);
  return Number.isNaN(n) ? 0 : n;
}

export function parseFailedValidationRow(item: unknown): FailedValidationRow | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = str(o.id);
  if (!id) return null;
  const payload =
    o.payload && typeof o.payload === "object"
      ? (o.payload as FailedValidationPayload)
      : {};
  return {
    id,
    createdAt: str(o.createdAt) || new Date().toISOString(),
    reason: str(o.reason),
    code: str(o.code),
    payload,
    requestId: o.requestId != null ? str(o.requestId) || null : null,
  };
}

export function parseRecentFailedItem(item: unknown): RecentFailedItem | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const at = str(o.at);
  const code = str(o.code);
  const error = str(o.error);
  const payload =
    o.payload && typeof o.payload === "object"
      ? (o.payload as FailedValidationPayload)
      : {};
  return { at, code, error, payload };
}

export function parseFailedValidationReport(data: unknown): FailedValidationReport | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const byCode: Record<string, number> = {};
  if (o.byCode && typeof o.byCode === "object") {
    for (const [k, v] of Object.entries(o.byCode)) {
      byCode[k] = num(v);
    }
  }
  const daily: Array<{ date: string; count: number }> = [];
  if (Array.isArray(o.daily)) {
    for (const d of o.daily) {
      if (d && typeof d === "object" && "date" in d && "count" in d) {
        daily.push({
          date: str((d as { date: unknown }).date),
          count: num((d as { count: unknown }).count),
        });
      }
    }
  }
  return {
    total: num(o.total),
    last24h: num(o.last24h),
    last7d: num(o.last7d),
    byCode,
    daily,
    since: str(o.since),
    generatedAt: str(o.generatedAt),
  };
}

export function normalizeFailedValidationList(envelope: unknown): FailedValidationRow[] {
  if (!envelope || typeof envelope !== "object") return [];
  const o = envelope as { success?: boolean; data?: unknown[] };
  if (o.success !== true || !Array.isArray(o.data)) return [];
  return o.data
    .map(parseFailedValidationRow)
    .filter((r): r is FailedValidationRow => r !== null);
}

export function normalizeRecentFailedList(envelope: unknown): RecentFailedItem[] {
  if (!envelope || typeof envelope !== "object") return [];
  const o = envelope as { success?: boolean; data?: unknown[] };
  if (o.success !== true || !Array.isArray(o.data)) return [];
  return o.data
    .map(parseRecentFailedItem)
    .filter((r): r is RecentFailedItem => r !== null);
}

export type ValidationFailedListResult = {
  items: FailedValidationRow[];
  meta: { page: number; limit: number; total: number };
};

/**
 * Fetches failed validations list from Core GET /api/validation/failed (server-side).
 */
export async function getValidationFailedList(params?: {
  page?: number;
  limit?: number;
  code?: string;
}): Promise<ValidationFailedListResult> {
  const defaultMeta = { page: params?.page ?? 1, limit: params?.limit ?? 20, total: 0 };
  try {
    const result = await getCoreValidationFailed(params);
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return { items: [], meta: defaultMeta };
    }
    const envelope = result.data as {
      success?: boolean;
      data?: unknown[];
      meta?: { page?: number; limit?: number; total?: number };
    };
    const items = normalizeFailedValidationList(envelope);
    const meta = envelope.meta ?? { ...defaultMeta, total: items.length };
    return {
      items,
      meta: {
        page: meta.page ?? defaultMeta.page,
        limit: meta.limit ?? defaultMeta.limit,
        total: meta.total ?? items.length,
      },
    };
  } catch {
    return { items: [], meta: defaultMeta };
  }
}

/**
 * Fetches failed validations report from Core GET /api/validation/failed/report (server-side).
 */
export async function getValidationFailedReport(params?: {
  days?: number;
}): Promise<FailedValidationReport | null> {
  try {
    const result = await getCoreValidationFailedReport({
      days: params?.days ?? 7,
    });
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return null;
    }
    const envelope = result.data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data ?? result.data : result.data;
    return parseFailedValidationReport(payload);
  } catch {
    return null;
  }
}

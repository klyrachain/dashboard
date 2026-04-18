/**
 * Connect (B2B) API data layer — overview, merchants, settlements.
 * @see md/connect-api.integration.md
 */

import {
  getCoreConnectOverview,
  getCoreConnectFeesReport,
  getCoreConnectMerchants,
  getCoreConnectMerchant,
  getCoreConnectSettlements,
  getCoreConnectSettlement,
} from "@/lib/core-api";
import { getSessionToken } from "@/lib/auth";

// ——— Overview ———

export type VolumeByPartnerItem = {
  businessId: string;
  businessName: string;
  volume: number;
};

export type RecentOnboardingItem = {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
};

/** Accumulated fee totals by token/currency. Keys = token symbol (e.g. GHS, USDC); values = sum of Transaction.fee for that f_token. */
export type FeesByCurrency = Record<string, string>;

export type ConnectOverview = {
  totalPlatformVolume: number;
  netRevenueFees: number;
  activeMerchants: number;
  volumeByPartner: VolumeByPartnerItem[];
  takeRate: number;
  recentOnboarding: RecentOnboardingItem[];
  /** Accumulated fees per currency (from Transaction.fee by f_token). */
  feesByCurrency: FeesByCurrency;
};

export type ConnectOverviewResult = { ok: boolean; data: ConnectOverview | null; error?: string };

function parseOverview(raw: unknown): ConnectOverview | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const totalPlatformVolume = typeof o.totalPlatformVolume === "number" ? o.totalPlatformVolume : 0;
  const netRevenueFees = typeof o.netRevenueFees === "number" ? o.netRevenueFees : 0;
  const activeMerchants = typeof o.activeMerchants === "number" ? o.activeMerchants : 0;
  const takeRate = typeof o.takeRate === "number" ? o.takeRate : 0;
  const volumeByPartner: VolumeByPartnerItem[] = Array.isArray(o.volumeByPartner)
    ? o.volumeByPartner.map((v: unknown) => {
      const item = v as Record<string, unknown>;
      return {
        businessId: String(item.businessId ?? ""),
        businessName: String(item.businessName ?? ""),
        volume: typeof item.volume === "number" ? item.volume : 0,
      };
    })
    : [];
  const recentOnboarding: RecentOnboardingItem[] = Array.isArray(o.recentOnboarding)
    ? o.recentOnboarding.map((r: unknown) => {
      const item = r as Record<string, unknown>;
      return {
        id: String(item.id ?? ""),
        name: String(item.name ?? ""),
        slug: String(item.slug ?? ""),
        createdAt: String(item.createdAt ?? ""),
      };
    })
    : [];
  const feesByCurrency: FeesByCurrency = {};
  if (o.feesByCurrency && typeof o.feesByCurrency === "object" && !Array.isArray(o.feesByCurrency)) {
    for (const [key, val] of Object.entries(o.feesByCurrency)) {
      const k = String(key).trim();
      if (k) feesByCurrency[k] = val != null ? String(val).trim() : "";
    }
  }
  return {
    totalPlatformVolume,
    netRevenueFees,
    activeMerchants,
    volumeByPartner,
    takeRate,
    recentOnboarding,
    feesByCurrency,
  };
}

export async function getConnectOverview(): Promise<ConnectOverviewResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectOverview(token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 403
            ? "Overview is for platform keys only."
            : "Request failed";
      return { ok: false, data: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data : null;
    const overview = payload ? parseOverview(payload) : null;
    return { ok: !!overview, data: overview, error: overview ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

/** GET /api/connect/fees/report — accumulated fees by currency; optional days, businessId. */
export type ConnectFeesReport = {
  byCurrency: FeesByCurrency;
  totalConverted: number;
  days: number | null;
  businessId: string | null;
};

export type ConnectFeesReportResult = { ok: boolean; data: ConnectFeesReport | null; error?: string };

function parseFeesReport(raw: unknown): ConnectFeesReport | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const byCurrency: FeesByCurrency = {};
  if (o.byCurrency && typeof o.byCurrency === "object" && !Array.isArray(o.byCurrency)) {
    for (const [key, val] of Object.entries(o.byCurrency)) {
      const k = String(key).trim();
      if (k) byCurrency[k] = val != null ? String(val).trim() : "";
    }
  }
  const totalConverted = typeof o.totalConverted === "number" ? o.totalConverted : 0;
  const days = o.days != null && typeof o.days === "number" ? o.days : null;
  const businessId = o.businessId != null ? String(o.businessId).trim() || null : null;
  return { byCurrency, totalConverted, days, businessId };
}

export async function getConnectFeesReport(params?: {
  days?: number | string;
  businessId?: string;
}): Promise<ConnectFeesReportResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectFeesReport({
      days: params?.days,
      businessId: params?.businessId,
    }, token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 403
            ? "Fees report is for platform keys only."
            : "Request failed";
      return { ok: false, data: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data : null;
    const report = payload ? parseFeesReport(payload) : null;
    return { ok: !!report, data: report, error: report ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

// ——— Merchants ———

export type MerchantFeeTier = { percentage?: number; flat?: number; max?: number };

export type ConnectMerchantListItem = {
  id: string;
  accountId: string;
  name: string;
  slug: string;
  logoUrl?: string;
  kybStatus: string;
  riskScore: number;
  balance: number;
  feeTier: MerchantFeeTier;
  createdAt: string;
};

export type ConnectMerchantListResult = {
  ok: boolean;
  items: ConnectMerchantListItem[];
  meta: { page: number; limit: number; total: number };
  error?: string;
};

function parseMerchantListItem(raw: unknown): ConnectMerchantListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "");
  if (!id) return null;
  const feeTier = (o.feeTier as MerchantFeeTier) ?? {};
  return {
    id,
    accountId: String(o.accountId ?? ""),
    name: String(o.name ?? ""),
    slug: String(o.slug ?? ""),
    logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : undefined,
    kybStatus: String(o.kybStatus ?? ""),
    riskScore: typeof o.riskScore === "number" ? o.riskScore : 0,
    balance: typeof o.balance === "number" ? o.balance : 0,
    feeTier,
    createdAt: String(o.createdAt ?? ""),
  };
}

export async function getConnectMerchants(params?: {
  page?: number;
  limit?: number;
  status?: string;
  riskLevel?: string;
}): Promise<ConnectMerchantListResult> {
  const defaultMeta = { page: params?.page ?? 1, limit: params?.limit ?? 20, total: 0 };
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectMerchants(params, token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 403
            ? "Merchants list is for platform keys only."
            : "Request failed";
      return { ok: false, items: [], meta: defaultMeta, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown[]; meta?: { page: number; limit: number; total: number } };
    const list = Array.isArray(envelope?.data) ? envelope.data : [];
    const meta = envelope?.meta ?? { ...defaultMeta, total: list.length };
    const items = list.map((row) => parseMerchantListItem(row)).filter((r): r is ConnectMerchantListItem => r != null);
    return { ok: true, items, meta };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, items: [], meta: defaultMeta, error: message };
  }
}

export type MerchantApiKey = { id: string; keyPrefix: string; name: string; lastUsedAt?: string; isActive: boolean };

export type ConnectMerchantDetail = ConnectMerchantListItem & {
  website?: string;
  supportEmail?: string;
  webhookUrl?: string;
  apiKeys: MerchantApiKey[];
  transactionCount: number;
  volume30d: number;
};

export type ConnectMerchantDetailResult = { ok: boolean; data: ConnectMerchantDetail | null; error?: string };

function parseMerchantDetail(raw: unknown): ConnectMerchantDetail | null {
  const base = parseMerchantListItem(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const apiKeys: MerchantApiKey[] = Array.isArray(o.apiKeys)
    ? o.apiKeys.map((k: unknown) => {
      const key = k as Record<string, unknown>;
      return {
        id: String(key.id ?? ""),
        keyPrefix: String(key.keyPrefix ?? ""),
        name: String(key.name ?? ""),
        lastUsedAt: typeof key.lastUsedAt === "string" ? key.lastUsedAt : undefined,
        isActive: key.isActive === true,
      };
    })
    : [];
  return {
    ...base,
    website: typeof o.website === "string" ? o.website : undefined,
    supportEmail: typeof o.supportEmail === "string" ? o.supportEmail : undefined,
    webhookUrl: typeof o.webhookUrl === "string" ? o.webhookUrl : undefined,
    apiKeys,
    transactionCount: typeof o.transactionCount === "number" ? o.transactionCount : 0,
    volume30d: typeof o.volume30d === "number" ? o.volume30d : 0,
  };
}

export async function getConnectMerchantById(id: string): Promise<ConnectMerchantDetailResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectMerchant(id, token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 404
            ? "Merchant not found"
            : status === 403
              ? "Not allowed"
              : "Request failed";
      return { ok: false, data: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data : null;
    const detail = payload ? parseMerchantDetail(payload) : null;
    return { ok: !!detail, data: detail, error: detail ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

// ——— Settlements ———

export type ConnectSettlementListItem = {
  id: string;
  batchId: string;
  businessId: string;
  businessName: string;
  businessSlug: string;
  amount: number;
  fee: number;
  currency: string;
  status: string;
  reference?: string;
  createdAt: string;
  updatedAt: string;
};

export type ConnectSettlementListResult = {
  ok: boolean;
  items: ConnectSettlementListItem[];
  meta: { page: number; limit: number; total: number };
  error?: string;
};

function parseSettlementListItem(raw: unknown): ConnectSettlementListItem | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "");
  if (!id) return null;
  return {
    id,
    batchId: String(o.batchId ?? o.id ?? ""),
    businessId: String(o.businessId ?? ""),
    businessName: String(o.businessName ?? ""),
    businessSlug: String(o.businessSlug ?? ""),
    amount: typeof o.amount === "number" ? o.amount : 0,
    fee: typeof o.fee === "number" ? o.fee : 0,
    currency: String(o.currency ?? "USD"),
    status: String(o.status ?? ""),
    reference: typeof o.reference === "string" ? o.reference : undefined,
    createdAt: String(o.createdAt ?? ""),
    updatedAt: String(o.updatedAt ?? ""),
  };
}

export async function getConnectSettlements(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<ConnectSettlementListResult> {
  const defaultMeta = { page: params?.page ?? 1, limit: params?.limit ?? 20, total: 0 };
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectSettlements(params, token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : "Request failed";
      return {
        ok: false,
        items: [],
        meta: defaultMeta,
        error: status ? `${err} (HTTP ${status})` : err,
      };
    }
    const envelope = data as { success?: boolean; data?: unknown[]; meta?: { page: number; limit: number; total: number } };
    const list = Array.isArray(envelope?.data) ? envelope.data : [];
    const meta = envelope?.meta ?? { ...defaultMeta, total: list.length };
    const items = list.map((row) => parseSettlementListItem(row)).filter((r): r is ConnectSettlementListItem => r != null);
    return { ok: true, items, meta };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, items: [], meta: defaultMeta, error: message };
  }
}

export type SettlementTimelineStep = { step: string; at: string; done: boolean };

export type ConnectSettlementDetail = ConnectSettlementListItem & {
  business?: { id: string; name: string; slug?: string };
  method?: string;
  gross: number;
  timeline: SettlementTimelineStep[];
  sourceTransactions: unknown[];
};

export type ConnectSettlementDetailResult = { ok: boolean; data: ConnectSettlementDetail | null; error?: string };

function parseSettlementDetail(raw: unknown): ConnectSettlementDetail | null {
  const base = parseSettlementListItem(raw);
  if (!base) return null;
  const o = raw as Record<string, unknown>;
  const gross = typeof o.gross === "number" ? o.gross : base.amount + base.fee;
  const timeline: SettlementTimelineStep[] = Array.isArray(o.timeline)
    ? o.timeline.map((t: unknown) => {
      const step = t as Record<string, unknown>;
      return {
        step: String(step.step ?? ""),
        at: String(step.at ?? ""),
        done: step.done === true,
      };
    })
    : [];
  const sourceTransactions = Array.isArray(o.sourceTransactions) ? o.sourceTransactions : [];
  return {
    ...base,
    gross,
    timeline,
    sourceTransactions,
    business: o.business && typeof o.business === "object" ? (o.business as { id: string; name: string; slug?: string }) : undefined,
    method: typeof o.method === "string" ? o.method : undefined,
  };
}

export async function getConnectSettlementById(id: string): Promise<ConnectSettlementDetailResult> {
  try {
    const token = await getSessionToken();
    const { ok, status, data } = await getCoreConnectSettlement(id, token ?? undefined);
    if (!ok || !data || typeof data !== "object") {
      const err =
        data && typeof data === "object" && "error" in data
          ? String((data as { error: string }).error)
          : status === 404
            ? "Settlement not found"
            : status === 403
              ? "Not allowed"
              : "Request failed";
      return { ok: false, data: null, error: err };
    }
    const envelope = data as { success?: boolean; data?: unknown };
    const payload = envelope.success !== false ? envelope.data : null;
    const detail = payload ? parseSettlementDetail(payload) : null;
    return { ok: !!detail, data: detail, error: detail ? undefined : "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, data: null, error: message };
  }
}

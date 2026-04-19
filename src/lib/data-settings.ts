/**
 * Platform Settings data layer — GET/PATCH for Core /api/settings/*.
 * @see Platform Settings API — Frontend Integration Report
 */

import {
  getCoreSettingsGeneral,
  patchCoreSettingsGeneral,
  getCoreSettingsFinancials,
  patchCoreSettingsFinancials,
  getCoreSettingsProviders,
  patchCoreSettingsProviders,
  patchCoreSettingsProviderById,
  getCoreSettingsRisk,
  patchCoreSettingsRisk,
  getCoreSettingsTeamAdmins,
  postCoreSettingsTeamInvite,
  getCoreSettingsApi,
  patchCoreSettingsApi,
  postCoreSettingsApiRotateWebhookSecret,
  getCoreMerchantTeamMembers,
  getCoreMerchantBusiness,
} from "@/lib/core-api";
import { getSessionToken } from "@/lib/auth";
import { postCoreAuthInviteCreate } from "@/lib/auth-api-server";
import { getPortalSsrAuthForCore } from "@/lib/portal-server-auth";
import type { QuoteCurrency } from "@/lib/token-rates";
import type { InviteCreateData } from "@/types/auth";
import type { MerchantBusinessProfile } from "@/types/merchant-api";

type Envelope<T> = { success?: boolean; data?: T; error?: string };

function extract<T>(res: {
  ok: boolean;
  status?: number;
  data: unknown;
}): { ok: boolean; data: T | null; error?: string } {
  if (!res.ok || !res.data || typeof res.data !== "object") {
    const err =
      res.data && typeof res.data === "object" && "error" in res.data
        ? String((res.data as { error: string }).error)
        : `Request failed${res.status ? ` (${res.status})` : ""}`;
    return { ok: false, data: null, error: err };
  }
  const envelope = res.data as Envelope<T>;
  if (envelope.success === false) {
    return { ok: false, data: null, error: envelope.error ?? "Request failed" };
  }
  const payload = envelope.data;
  return { ok: true, data: payload ?? null, error: payload ? undefined : envelope.error };
}

// ——— General ———

export type SettingsGeneral = {
  publicName: string;
  supportEmail: string;
  supportPhone?: string;
  defaultCurrency: string;
  timezone: string;
  maintenanceMode: boolean;
};

const defaultGeneral: SettingsGeneral = {
  publicName: "",
  supportEmail: "",
  supportPhone: "",
  defaultCurrency: "USD",
  timezone: "Africa/Accra",
  maintenanceMode: false,
};

function parseGeneral(raw: unknown): SettingsGeneral {
  if (!raw || typeof raw !== "object") return defaultGeneral;
  const o = raw as Record<string, unknown>;
  return {
    publicName: typeof o.publicName === "string" ? o.publicName : defaultGeneral.publicName,
    supportEmail: typeof o.supportEmail === "string" ? o.supportEmail : defaultGeneral.supportEmail,
    supportPhone: typeof o.supportPhone === "string" ? o.supportPhone : defaultGeneral.supportPhone,
    defaultCurrency: typeof o.defaultCurrency === "string" ? o.defaultCurrency : defaultGeneral.defaultCurrency,
    timezone: typeof o.timezone === "string" ? o.timezone : defaultGeneral.timezone,
    maintenanceMode: o.maintenanceMode === true,
  };
}

export async function getSettingsGeneral(): Promise<{
  ok: boolean;
  data: SettingsGeneral | null;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await getCoreSettingsGeneral(token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) {
    return { ok: false, data: null, error: out.error };
  }
  if (out.data == null) {
    return { ok: true, data: null, error: out.error };
  }
  return {
    ok: true,
    data: parseGeneral(out.data),
    error: undefined,
  };
}

export async function patchSettingsGeneral(
  body: Partial<SettingsGeneral>
): Promise<{ ok: boolean; data: SettingsGeneral | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsGeneral(body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  return {
    ok: out.ok,
    data: out.data ? parseGeneral(out.data) : null,
    error: out.error,
  };
}

// ——— Financials ———

const DEFAULT_BASE_CURRENCY: QuoteCurrency = "usdc";

export type SettingsFinancials = {
  baseFeePercent: number;
  fixedFee: number;
  minTransactionSize: number;
  maxTransactionSize: number;
  lowBalanceAlert: number;
  /** Platform display/conversion base currency (USDC, USD, GHS). Used for totals and rate requests. */
  baseCurrency: QuoteCurrency;
};

const defaultFinancials: SettingsFinancials = {
  baseFeePercent: 1,
  fixedFee: 0.5,
  minTransactionSize: 5,
  maxTransactionSize: 10000,
  lowBalanceAlert: 500,
  baseCurrency: DEFAULT_BASE_CURRENCY,
};

function parseFinancials(raw: unknown): SettingsFinancials {
  if (!raw || typeof raw !== "object") return defaultFinancials;
  const o = raw as Record<string, unknown>;
  const baseCurrencyRaw = o.baseCurrency;
  const baseCurrency =
    baseCurrencyRaw === "usd" || baseCurrencyRaw === "usdc" || baseCurrencyRaw === "ghs"
      ? baseCurrencyRaw
      : DEFAULT_BASE_CURRENCY;
  return {
    baseFeePercent: typeof o.baseFeePercent === "number" ? o.baseFeePercent : defaultFinancials.baseFeePercent,
    fixedFee: typeof o.fixedFee === "number" ? o.fixedFee : defaultFinancials.fixedFee,
    minTransactionSize: typeof o.minTransactionSize === "number" ? o.minTransactionSize : defaultFinancials.minTransactionSize,
    maxTransactionSize: typeof o.maxTransactionSize === "number" ? o.maxTransactionSize : defaultFinancials.maxTransactionSize,
    lowBalanceAlert: typeof o.lowBalanceAlert === "number" ? o.lowBalanceAlert : defaultFinancials.lowBalanceAlert,
    baseCurrency,
  };
}

export async function getSettingsFinancials(): Promise<{
  ok: boolean;
  data: SettingsFinancials | null;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await getCoreSettingsFinancials(token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) {
    return { ok: false, data: null, error: out.error };
  }
  if (out.data == null) {
    return { ok: true, data: null, error: out.error };
  }
  return {
    ok: true,
    data: parseFinancials(out.data),
    error: undefined,
  };
}

export async function patchSettingsFinancials(
  body: Partial<SettingsFinancials>
): Promise<{ ok: boolean; data: SettingsFinancials | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsFinancials(body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  return {
    ok: out.ok,
    data: out.data ? parseFinancials(out.data) : null,
    error: out.error,
  };
}

// ——— Providers ———

export type SettingsProvider = {
  id: string;
  enabled: boolean;
  priority: number;
  apiKeyMasked: string;
  status?: string;
  latencyMs?: number | null;
};

export type SettingsProviders = {
  maxSlippagePercent: number;
  providers: SettingsProvider[];
};

const defaultProviders: SettingsProviders = {
  maxSlippagePercent: 0.5,
  providers: [],
};

function parseProvider(raw: unknown): SettingsProvider | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "");
  if (!id) return null;
  return {
    id,
    enabled: o.enabled === true,
    priority: typeof o.priority === "number" ? o.priority : 1,
    apiKeyMasked: typeof o.apiKeyMasked === "string" ? o.apiKeyMasked : "••••••••",
    status: typeof o.status === "string" ? o.status : undefined,
    latencyMs: typeof o.latencyMs === "number" ? o.latencyMs : null,
  };
}

export async function getSettingsProviders(): Promise<{
  ok: boolean;
  data: SettingsProviders;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await getCoreSettingsProviders(token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok || !out.data || typeof out.data !== "object") {
    return { ok: false, data: defaultProviders, error: out.error };
  }
  const o = out.data as Record<string, unknown>;
  const maxSlippagePercent = typeof o.maxSlippagePercent === "number" ? o.maxSlippagePercent : 0.5;
  const list = Array.isArray(o.providers) ? o.providers : [];
  const providers = list.map(parseProvider).filter((p): p is SettingsProvider => p != null);
  return {
    ok: true,
    data: { maxSlippagePercent, providers },
    error: undefined,
  };
}

export async function patchSettingsProviders(body: {
  maxSlippagePercent?: number;
  providers?: Array<{ id: string; enabled?: boolean; priority?: number }>;
}): Promise<{ ok: boolean; data: SettingsProviders | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsProviders(body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) return { ok: false, data: null, error: out.error };
  if (!out.data || typeof out.data !== "object") return { ok: true, data: null };
  const o = out.data as Record<string, unknown>;
  const maxSlippagePercent = typeof o.maxSlippagePercent === "number" ? o.maxSlippagePercent : 0.5;
  const list = Array.isArray(o.providers) ? o.providers : [];
  const providers = list.map(parseProvider).filter((p): p is SettingsProvider => p != null);
  return { ok: true, data: { maxSlippagePercent, providers } };
}

export async function patchSettingsProviderById(
  id: string,
  body: { apiKey?: string; enabled?: boolean; priority?: number }
): Promise<{ ok: boolean; data: SettingsProvider | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsProviderById(id, body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) return { ok: false, data: null, error: out.error };
  const p = out.data ? parseProvider(out.data) : null;
  return { ok: true, data: p };
}

// ——— Risk ———

export type SettingsRisk = {
  enforceKycOver1000: boolean;
  blockHighRiskIp: boolean;
  blacklist: string[];
};

const defaultRisk: SettingsRisk = {
  enforceKycOver1000: true,
  blockHighRiskIp: true,
  blacklist: [],
};

export async function getSettingsRisk(): Promise<{
  ok: boolean;
  data: SettingsRisk;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await getCoreSettingsRisk(token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok || !out.data || typeof out.data !== "object") {
    return { ok: false, data: defaultRisk, error: out.error };
  }
  const o = out.data as Record<string, unknown>;
  const blacklist = Array.isArray(o.blacklist)
    ? o.blacklist.filter((x): x is string => typeof x === "string")
    : [];
  return {
    ok: true,
    data: {
      enforceKycOver1000: o.enforceKycOver1000 === true,
      blockHighRiskIp: o.blockHighRiskIp === true,
      blacklist,
    },
  };
}

export async function patchSettingsRisk(body: {
  enforceKycOver1000?: boolean;
  blockHighRiskIp?: boolean;
  blacklist?: string[];
}): Promise<{ ok: boolean; data: SettingsRisk | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsRisk(body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) return { ok: false, data: null, error: out.error };
  if (!out.data || typeof out.data !== "object") return { ok: true, data: null };
  const o = out.data as Record<string, unknown>;
  const blacklist = Array.isArray(o.blacklist)
    ? o.blacklist.filter((x): x is string => typeof x === "string")
    : [];
  return {
    ok: true,
    data: {
      enforceKycOver1000: o.enforceKycOver1000 === true,
      blockHighRiskIp: o.blockHighRiskIp === true,
      blacklist,
    },
  };
}

// ——— Team ———

export type SettingsAdmin = {
  id: string;
  name: string;
  email: string;
  role: string;
  twoFaEnabled: boolean;
};

export async function getSettingsTeamAdmins(): Promise<{
  ok: boolean;
  data: SettingsAdmin[];
  error?: string;
}> {
  try {
    const token = await getSessionToken();
    const res = await getCoreSettingsTeamAdmins(token ?? undefined);
    const out = extract<unknown[]>(res);
    if (!out.ok || !Array.isArray(out.data)) {
      return { ok: false, data: [], error: out.error };
    }
    const data = out.data
      .map((row) => {
        if (!row || typeof row !== "object") return null;
        const o = row as Record<string, unknown>;
        const id = String(o.id ?? "");
        if (!id) return null;
        return {
          id,
          name: String(o.name ?? ""),
          email: String(o.email ?? ""),
          role: String(o.role ?? "viewer"),
          twoFaEnabled: o.twoFaEnabled === true,
        };
      })
      .filter((r): r is SettingsAdmin => r != null);
    return { ok: true, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Request failed";
    const cause = e instanceof Error ? (e as Error & { cause?: { code?: string } }).cause : undefined;
    const isNetwork =
      cause?.code === "ECONNREFUSED" ||
      (typeof message === "string" && (message.includes("fetch failed") || message.includes("ECONNREFUSED")));
    return {
      ok: false,
      data: [],
      error: isNetwork ? "Core API unreachable. Check that the Core server is running." : message,
    };
  }
}

export async function postSettingsTeamInvite(body: {
  email: string;
  role?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const token = await getSessionToken();
  const res = await postCoreSettingsTeamInvite(body, token ?? undefined);
  if (res.ok) return { ok: true };
  const err =
    res.data && typeof res.data === "object" && "error" in res.data
      ? String((res.data as { error: string }).error)
      : "Invite failed";
  return { ok: false, error: err };
}

/**
 * Create invite via Auth API (POST /api/auth/invite).
 * Returns invite link and expiresAt for the UI. Uses x-api-key server-side.
 */
export async function postAuthInvite(body: {
  email: string;
  role?: string;
}): Promise<{
  ok: boolean;
  inviteLink?: string;
  expiresAt?: string;
  inviteId?: string;
  error?: string;
  code?: string;
}> {
  const res = await postCoreAuthInviteCreate(
    { email: body.email.trim(), role: (body.role ?? "viewer").trim() },
    undefined
  );
  if (!res.ok || !res.data || typeof res.data !== "object") {
    const err =
      res.data && typeof res.data === "object" && "error" in res.data
        ? String((res.data as { error: string }).error)
        : "Invite failed";
    const code =
      res.data && typeof res.data === "object" && "code" in res.data
        ? String((res.data as { code: string }).code)
        : undefined;
    return { ok: false, error: err, code };
  }
  const raw = res.data as
    | { success?: boolean; data?: InviteCreateData; error?: string; code?: string }
    | InviteCreateData;
  const data: InviteCreateData | null =
    raw && typeof raw === "object" && "success" in raw && raw.success === true && raw.data
      ? raw.data
      : raw && typeof raw === "object" && "inviteLink" in raw
        ? (raw as InviteCreateData)
        : null;
  if (!data || !data.inviteLink) {
    return {
      ok: false,
      error: (raw && typeof raw === "object" && "error" in raw ? (raw as { error: string }).error : null) ?? "Invite failed",
      code: raw && typeof raw === "object" && "code" in raw ? String((raw as { code: string }).code) : undefined,
    };
  }
  return {
    ok: true,
    inviteLink: data.inviteLink,
    expiresAt: data.expiresAt,
    inviteId: data.inviteId,
  };
}

// ——— API & Webhooks ———

export type SettingsApi = {
  webhookSigningSecretMasked: string;
  slackWebhookUrl: string;
  alertEmails: string;
};

const defaultApi: SettingsApi = {
  webhookSigningSecretMasked: "whsec_••••••••••••••••",
  slackWebhookUrl: "",
  alertEmails: "",
};

export async function getSettingsApi(): Promise<{
  ok: boolean;
  data: SettingsApi | null;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await getCoreSettingsApi(token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) {
    return { ok: false, data: null, error: out.error };
  }
  if (!out.data || typeof out.data !== "object") {
    return { ok: true, data: null, error: out.error };
  }
  const o = out.data as Record<string, unknown>;
  return {
    ok: true,
    data: {
      webhookSigningSecretMasked:
        typeof o.webhookSigningSecretMasked === "string"
          ? o.webhookSigningSecretMasked
          : defaultApi.webhookSigningSecretMasked,
      slackWebhookUrl: typeof o.slackWebhookUrl === "string" ? o.slackWebhookUrl : "",
      alertEmails: typeof o.alertEmails === "string" ? o.alertEmails : "",
    },
  };
}

export async function patchSettingsApi(body: {
  slackWebhookUrl?: string;
  alertEmails?: string;
}): Promise<{ ok: boolean; data: SettingsApi | null; error?: string }> {
  const token = await getSessionToken();
  const res = await patchCoreSettingsApi(body as Record<string, unknown>, token ?? undefined);
  const out = extract<unknown>(res);
  if (!out.ok) return { ok: false, data: null, error: out.error };
  if (!out.data || typeof out.data !== "object") return { ok: true, data: null };
  const o = out.data as Record<string, unknown>;
  return {
    ok: true,
    data: {
      webhookSigningSecretMasked:
        typeof o.webhookSigningSecretMasked === "string"
          ? o.webhookSigningSecretMasked
          : defaultApi.webhookSigningSecretMasked,
      slackWebhookUrl: typeof o.slackWebhookUrl === "string" ? o.slackWebhookUrl : "",
      alertEmails: typeof o.alertEmails === "string" ? o.alertEmails : "",
    },
  };
}

export async function postSettingsApiRotateWebhookSecret(): Promise<{
  ok: boolean;
  webhookSigningSecretMasked?: string;
  error?: string;
}> {
  const token = await getSessionToken();
  const res = await postCoreSettingsApiRotateWebhookSecret(token ?? undefined);
  if (!res.ok) {
    const err =
      res.data && typeof res.data === "object" && "error" in res.data
        ? String((res.data as { error: string }).error)
        : "Rotate failed";
    return { ok: false, error: err };
  }
  const envelope = res.data as Envelope<{ webhookSigningSecretMasked?: string }>;
  const data = envelope?.data;
  const masked =
    data && typeof data === "object" && "webhookSigningSecretMasked" in data
      ? String((data as { webhookSigningSecretMasked: string }).webhookSigningSecretMasked)
      : undefined;
  return { ok: true, webhookSigningSecretMasked: masked };
}

// ——— Merchant portal (Core `/api/v1/merchant/*`, Bearer + cookies from SSR) ———

function parseMerchantTeamRowToAdmin(row: unknown): SettingsAdmin | null {
  if (!row || typeof row !== "object") return null;
  const o = row as Record<string, unknown>;
  const id = String(o.id ?? "");
  if (!id) return null;
  const email = String(o.email ?? "");
  const display = String(o.displayName ?? "").trim();
  const name = display.length > 0 ? display : email.split("@")[0] || "Member";
  return {
    id,
    name,
    email,
    role: String(o.role ?? "MEMBER"),
    twoFaEnabled: o.twoFaEnabled === true,
  };
}

function parseMerchantBusinessSsr(raw: unknown): MerchantBusinessProfile | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  const name = typeof o.name === "string" ? o.name : "";
  const slug = typeof o.slug === "string" ? o.slug : "";
  if (!id || !name || !slug) return null;
  return {
    id,
    name,
    slug,
    logoUrl: typeof o.logoUrl === "string" ? o.logoUrl : null,
    website: typeof o.website === "string" ? o.website : null,
    supportEmail: typeof o.supportEmail === "string" ? o.supportEmail : null,
    kybStatus: typeof o.kybStatus === "string" ? o.kybStatus : undefined,
    riskScore: typeof o.riskScore === "number" ? o.riskScore : (o.riskScore === null ? null : undefined),
    webhookUrl: typeof o.webhookUrl === "string" ? o.webhookUrl : null,
    country: typeof o.country === "string" ? o.country : null,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : undefined,
    portalKycStatus:
      o.portalKycStatus === null || o.portalKycStatus === undefined
        ? undefined
        : String(o.portalKycStatus),
    portalKycProvider:
      o.portalKycProvider === null || o.portalKycProvider === undefined
        ? undefined
        : String(o.portalKycProvider),
    portalKycVerifiedAt:
      typeof o.portalKycVerifiedAt === "string" ? o.portalKycVerifiedAt : undefined,
    isFirstActiveMember: o.isFirstActiveMember === true,
  };
}

export type TeamSettingsSource = "merchant" | "platform";

/** Platform admins from Core settings, or business members when portal SSR cookies are present. */
export async function getSettingsTeamForPage(): Promise<{
  ok: boolean;
  data: SettingsAdmin[];
  error?: string;
  source: TeamSettingsSource;
}> {
  const portal = await getPortalSsrAuthForCore();
  if (portal) {
    const res = await getCoreMerchantTeamMembers(portal.bearerToken, portal.extraHeaders);
    const out = extract<unknown[]>(res);
    if (!out.ok || !Array.isArray(out.data)) {
      return {
        ok: false,
        data: [],
        error: out.error ?? "Could not load team.",
        source: "merchant",
      };
    }
    const data = out.data
      .map(parseMerchantTeamRowToAdmin)
      .filter((r): r is SettingsAdmin => r != null);
    return { ok: true, data, source: "merchant" };
  }
  const r = await getSettingsTeamAdmins();
  return {
    ok: r.ok,
    data: r.data,
    error: r.error,
    source: "platform",
  };
}

/** `GET /api/v1/merchant/business` for RSC (same auth as browser merchant API). */
export async function getMerchantBusinessProfileSsr(): Promise<{
  ok: boolean;
  data: MerchantBusinessProfile | null;
  error?: string;
}> {
  try {
    const portal = await getPortalSsrAuthForCore();
    if (!portal) {
      return { ok: false, data: null, error: undefined };
    }
    const res = await getCoreMerchantBusiness(portal.bearerToken, portal.extraHeaders);
    const out = extract<unknown>(res);
    if (!out.ok) {
      return {
        ok: false,
        data: null,
        error: out.error?.trim() || "Could not load business profile from the server.",
      };
    }
    if (out.data == null) {
      return { ok: true, data: null, error: out.error };
    }
    const parsed = parseMerchantBusinessSsr(out.data);
    return {
      ok: true,
      data: parsed,
      error: parsed ? undefined : "Invalid business profile response.",
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      data: null,
      error:
        msg.includes("Core API base URL") || msg.includes("not configured")
          ? "Application server is missing Core API URL configuration."
          : "Could not reach the business profile service. Try again shortly.",
    };
  }
}

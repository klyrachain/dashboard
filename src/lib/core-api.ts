/**
 * Core API client — health, readiness, fetch API, and webhooks.
 * Base URL from NEXT_PUBLIC_CORE_URL (default dev: http://localhost:4000).
 * Protected routes require x-api-key (CORE_API_KEY). Public: GET /health, GET /ready.
 * @see md/core-api-integration.md
 */

import type {
  CoreAdminWebhookBody,
  CoreAdminWebhookSuccess,
  CoreApiError,
  CoreFetchSuccess,
  CoreHealthResponse,
  CoreWebhookOrderBody,
  CoreWebhookOrderSuccess,
} from "@/types/core-api";

// const DEFAULT_CORE_URL = "http://localhost:4000";
const HEALTH_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 15000;

export function getCoreBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CORE_URL!;
}

/** API key for protected routes (server-only; do not use NEXT_PUBLIC_). */
function getCoreApiKey(): string | undefined {
  return process.env.CORE_API_KEY?.trim() || undefined;
}

/** Paths that skip auth (public). Everything else requires x-api-key. */
function isPublicPath(path: string): boolean {
  const pathname = path.replace(/\?.*$/, "").replace(/^\//, "").toLowerCase();
  return (
    pathname === "health" ||
    pathname === "ready" ||
    pathname.startsWith("api/quote")
  );
}

function coreHeaders(path: string, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (!isPublicPath(path)) {
    const key = getCoreApiKey();
    if (key) headers["x-api-key"] = key;
  }
  return headers;
}

async function fetchCore<T>(
  path: string,
  options?: RequestInit & { timeout?: number }
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const timeout = options?.timeout ?? HEALTH_TIMEOUT_MS;
  const { timeout: _t, ...rest } = options ?? {};
  // #region agent log
  try {
    const res = await fetch(url, {
      ...rest,
      headers: coreHeaders(path, rest?.headers),
      signal: AbortSignal.timeout(timeout),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    const dataObj = data && typeof data === "object" ? (data as Record<string, unknown>) : null;
    const dataArray = dataObj && "data" in dataObj ? dataObj.data : undefined;
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "core-api.ts:fetchCore",
        message: "Core API response",
        data: {
          path: path.split("?")[0],
          ok: res.ok,
          status: res.status,
          coreError: !res.ok && dataObj && "error" in dataObj ? String(dataObj.error) : undefined,
          hasDataObject: !!dataObj,
          dataKeys: dataObj ? Object.keys(dataObj).slice(0, 10) : [],
          isDataArray: Array.isArray(dataArray),
          dataLength: Array.isArray(dataArray) ? dataArray.length : 0,
        },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: ["A", "B", "D", "E"],
      }),
    }).catch(() => { });
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    fetch("http://127.0.0.1:7247/ingest/fb2f2837-e364-4285-91d5-3a0ec374dc33", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "core-api.ts:fetchCore",
        message: "Core API request failed",
        data: { path: path.split("?")[0], error: message },
        timestamp: Date.now(),
        sessionId: "debug-session",
        hypothesisId: "C",
      }),
    }).catch(() => { });
    throw err;
  }
  // #endregion
}

/** GET request to Core fetch API; returns envelope { success, data, meta? }. */
async function fetchCoreGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<{
  status: number; ok: boolean; data: CoreFetchSuccess<T> | CoreApiError
}> {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") search.set(k, String(v));
    }
  }
  const qs = search.toString();
  const fullPath = qs ? `${path}?${qs}` : path;
  const { ok, status, data } = await fetchCore<CoreFetchSuccess<T> | CoreApiError>(
    fullPath,
    { timeout: FETCH_TIMEOUT_MS }
  );
  return { ok, status, data: data as CoreFetchSuccess<T> | CoreApiError };
}

/** POST request to Core; returns envelope { success, data }. */
async function fetchCorePost<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: coreHeaders(path),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** POST api/quote/swap — single provider quote (0x | squid | lifi). Payload: provider, from_token, to_token, amount, from_chain, to_chain, from_address. */
const QUOTE_SWAP_PATH = "api/quote/swap";

export type CoreQuoteSwapBody = {
  provider: string;
  from_token: string;
  to_token: string;
  amount: string;
  from_chain: number;
  to_chain: number;
  from_address: string;
  to_address?: string;
  slippage?: number;
};

export async function postCoreQuoteSwap(body: CoreQuoteSwapBody) {
  const payload: Record<string, unknown> = {
    provider: body.provider,
    from_token: body.from_token,
    to_token: body.to_token,
    amount: body.amount,
    from_chain: body.from_chain,
    to_chain: body.to_chain,
    from_address: body.from_address,
  };
  if (body.to_address != null && body.to_address !== "") payload.to_address = body.to_address;
  if (body.slippage != null) payload.slippage = body.slippage;
  return fetchCorePost<unknown>(QUOTE_SWAP_PATH, payload);
}

/** POST /api/quote/best — best quote across providers (no provider in body). */
export type CoreQuoteBestBody = {
  from_token: string;
  to_token: string;
  amount: string;
  from_chain: number;
  to_chain: number;
  from_address: string;
  to_address?: string;
  slippage?: number;
};

export async function postCoreQuoteBest(body: CoreQuoteBestBody) {
  return fetchCorePost<unknown>("api/quote/best", body as Record<string, unknown>);
}

/** POST api/quote/onramp — fiat↔crypto quote (Fonbnk; optional swap when token not in pool). */
export type CoreQuoteOnrampBody = {
  country: string;
  chain_id: number;
  token: string;
  amount: number;
  amount_in: "fiat" | "crypto";
  purchase_method?: "buy" | "sell";
  from_address?: string;
  token_decimals?: number;
};

/** Onramp quote response data (pool token or with swap). */
export type CoreQuoteOnrampData = {
  country: string;
  currency: string;
  chain_id: number;
  token: string;
  token_symbol?: string;
  amount: number;
  amount_in: "fiat" | "crypto";
  rate: number;
  fee: number;
  total_crypto: string;
  total_fiat: number;
  swap?: {
    from_chain_id: number;
    from_token: string;
    to_chain_id: number;
    to_token: string;
    from_amount: string;
    to_amount: string;
    provider: string;
  };
};

export async function postCoreQuoteOnramp(body: CoreQuoteOnrampBody) {
  const payload: Record<string, unknown> = {
    country: body.country.trim(),
    chain_id: body.chain_id,
    token: body.token.trim(),
    amount: body.amount,
    amount_in: body.amount_in,
  };
  if (body.purchase_method != null) payload.purchase_method = body.purchase_method;
  if (body.from_address != null && body.from_address !== "") payload.from_address = body.from_address;
  if (body.token_decimals != null) payload.token_decimals = body.token_decimals;
  return fetchCorePost<{ success?: boolean; data?: CoreQuoteOnrampData }>("api/quote/onramp", payload);
}

/**
 * Liveness — process is up.
 * GET /health → 200 { ok: true }
 */
export async function checkCoreHealth(): Promise<CoreHealthResponse> {
  try {
    const { ok, data } = await fetchCore<CoreHealthResponse>("/health");
    if (ok && data) return data as CoreHealthResponse;
    return { ok: false, error: "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }
}

/**
 * Readiness — DB + Redis connected.
 * GET /ready → 200 { ok: true } or 503 { ok: false, error: "..." }
 */
export async function checkCoreReady(): Promise<CoreHealthResponse> {
  try {
    const { ok, data } = await fetchCore<CoreHealthResponse>("/ready");
    if (data) return data as CoreHealthResponse;
    return { ok: false, error: "Invalid response" };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }
}

// ——— Fetch API (GET) ———

export async function getCoreUsers(params?: {
  page?: number;
  limit?: number;
}) {
  return fetchCoreGet<unknown[]>("api/users", {
    page: params?.page,
    limit: params?.limit,
  });
}

export async function getCoreUser(id: string) {
  return fetchCoreGet<unknown>(`api/users/${encodeURIComponent(id)}`);
}

export async function getCoreTransactions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  f_chain?: string;
  t_chain?: string;
}) {
  return fetchCoreGet<unknown[]>("api/transactions", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    type: params?.type,
    f_chain: params?.f_chain,
    t_chain: params?.t_chain,
  });
}

export async function getCoreTransaction(id: string) {
  return fetchCoreGet<unknown>(`api/transactions/${encodeURIComponent(id)}`);
}

export async function getCoreRequests(params?: { page?: number; limit?: number }) {
  return fetchCoreGet<unknown[]>("api/requests", {
    page: params?.page,
    limit: params?.limit,
  });
}

export async function getCoreRequest(id: string) {
  return fetchCoreGet<unknown>(`api/requests/${encodeURIComponent(id)}`);
}

export async function getCoreClaims(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return fetchCoreGet<unknown[]>("api/claims", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
  });
}

export async function getCoreClaim(id: string) {
  return fetchCoreGet<unknown>(`api/claims/${encodeURIComponent(id)}`);
}

export async function getCoreWallets(params?: { page?: number; limit?: number }) {
  return fetchCoreGet<unknown[]>("api/wallets", {
    page: params?.page,
    limit: params?.limit,
  });
}

export async function getCoreWallet(id: string) {
  return fetchCoreGet<unknown>(`api/wallets/${encodeURIComponent(id)}`);
}

export async function getCoreInventory(params?: {
  page?: number;
  limit?: number;
  chain?: string;
  chainId?: number;
  address?: string;
}) {
  return fetchCoreGet<unknown[]>("api/inventory", {
    page: params?.page,
    limit: params?.limit,
    chain: params?.chain,
    chainId: params?.chainId,
    address: params?.address,
  });
}

export async function getCoreInventoryAsset(id: string) {
  return fetchCoreGet<unknown>(`api/inventory/${encodeURIComponent(id)}`);
}

/** Body for POST /api/inventory — create inventory asset. */
export type CreateCoreInventoryBody = {
  chain: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
  walletAddress?: string;
  chainId?: number;
};

export async function postCoreInventory(body: CreateCoreInventoryBody) {
  const payload: Record<string, unknown> = {
    chain: body.chain,
    balance: body.balance ?? "0",
  };
  if (body.token != null) payload.token = body.token;
  if (body.symbol != null) payload.symbol = body.symbol;
  if (body.walletAddress != null) payload.walletAddress = body.walletAddress;
  if (body.chainId != null) payload.chainId = body.chainId;
  return fetchCorePost<unknown>("api/inventory", payload);
}

/** Body for PATCH /api/inventory/:id. */
export type UpdateCoreInventoryBody = {
  chain?: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
};

export async function patchCoreInventory(id: string, body: UpdateCoreInventoryBody) {
  const payload: Record<string, unknown> = {};
  if (body.chain != null) payload.chain = body.chain;
  if (body.token != null) payload.token = body.token;
  if (body.symbol != null) payload.symbol = body.symbol;
  if (body.balance != null) payload.balance = body.balance;
  return fetchCorePatch<unknown>(`api/inventory/${encodeURIComponent(id)}`, payload);
}

export async function deleteCoreInventory(id: string) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const path = `api/inventory/${encodeURIComponent(id)}`;
  const res = await fetch(`${base}/${path}`, {
    method: "DELETE",
    headers: coreHeaders(path),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/**
 * GET /api/inventory/history — list all inventory history (paginated).
 * Query: page, limit (default 20, max 100), assetId, chain.
 * Response: { success, data: [...], meta: { page, limit, total } }.
 * Each item includes InventoryHistory fields + asset: { id, chain, symbol }.
 */
export async function getCoreInventoryHistoryList(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
}) {
  const limit =
    params?.limit != null
      ? Math.min(100, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/inventory/history", {
    page: params?.page,
    limit: limit ?? 20,
    assetId: params?.assetId,
    chain: params?.chain,
  });
}

/** GET /api/inventory/:id/history — history for one asset (legacy/per-asset). */
export async function getCoreInventoryHistory(
  id: string,
  params?: { page?: number; limit?: number }
) {
  return fetchCoreGet<unknown[]>(
    `api/inventory/${encodeURIComponent(id)}/history`,
    { page: params?.page, limit: params?.limit }
  );
}

export async function getCoreCacheBalances(params?: { limit?: number }) {
  return fetchCoreGet<unknown[]>("api/cache/balances", {
    limit: params?.limit,
  });
}

export async function getCoreCacheBalance(chain: string, token: string) {
  return fetchCoreGet<unknown>(
    `api/cache/balances/${encodeURIComponent(chain)}/${encodeURIComponent(token)}`
  );
}

export async function getCoreQueuePoll(params?: { limit?: number }) {
  return fetchCoreGet<unknown>("api/queue/poll", { limit: params?.limit });
}

// ——— Invoices API ———

/** GET /api/invoices — list with ?page, ?limit (default 20, max 100), ?status */
export async function getCoreInvoices(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  const limit =
    params?.limit != null
      ? Math.min(100, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/invoices", {
    page: params?.page,
    limit: limit ?? 20,
    status: params?.status,
  });
}

/** GET /api/invoices/:id — full invoice; 404 if not found */
export async function getCoreInvoice(id: string) {
  return fetchCoreGet<unknown>(`api/invoices/${encodeURIComponent(id)}`);
}

/** Request body for POST /api/invoices — required: billedTo, subject, dueDate, lineItems (≥1). */
export type CreateCoreInvoiceBody = {
  billedTo: string;
  subject: string;
  dueDate: string;
  lineItems: Array<{
    productName: string;
    qty: number;
    unitPrice: number;
    amount?: number;
  }>;
  billingDetails?: string;
  discountPercent?: number;
  termsAndConditions?: string;
  notesContent?: string;
  sendNow?: boolean;
};

/** POST /api/invoices — create; required: billedTo, subject, dueDate, lineItems; optional sendNow. Normalizes line item amount to qty×unitPrice when missing. */
export async function createCoreInvoice(body: CreateCoreInvoiceBody) {
  const lineItems = body.lineItems.map((li) => ({
    productName: li.productName,
    qty: li.qty,
    unitPrice: li.unitPrice,
    amount: li.amount ?? li.qty * li.unitPrice,
  }));

  const payload: Record<string, unknown> = {
    billedTo: body.billedTo.trim(),
    subject: body.subject.trim(),
    dueDate: body.dueDate,
    lineItems,
  };
  if (body.billingDetails != null && body.billingDetails !== "") {
    payload.billingDetails = body.billingDetails.trim();
  }
  if (body.discountPercent != null && body.discountPercent > 0) {
    payload.discountPercent = body.discountPercent;
  }
  if (body.termsAndConditions != null && body.termsAndConditions !== "") {
    payload.termsAndConditions = body.termsAndConditions;
  }
  if (body.notesContent != null && body.notesContent !== "") {
    payload.notesContent = body.notesContent;
  }
  if (body.sendNow === true) {
    payload.sendNow = true;
  }

  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/invoices`, {
    method: "POST",
    headers: coreHeaders("api/invoices"),
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** PATCH /api/invoices/:id — partial update; 409 if Paid/Cancelled */
export async function updateCoreInvoice(
  id: string,
  body: {
    subject?: string;
    dueDate?: string;
    notes?: string | null;
    notesContent?: string;
    billedTo?: string;
    billingDetails?: string;
    termsAndConditions?: string;
    lineItems?: Array<{
      id?: string;
      productName: string;
      qty: number;
      unitPrice: number;
      amount?: number;
    }>;
  }
) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/invoices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: coreHeaders("api/invoices"),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** POST /api/invoices/:id/send — send/resend; optional toEmail */
export async function sendCoreInvoice(id: string, toEmail?: string) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/send`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices"),
      body: JSON.stringify(toEmail != null ? { toEmail } : {}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** POST /api/invoices/:id/duplicate — new draft copy; returns new invoice in data */
export async function duplicateCoreInvoice(id: string) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/duplicate`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices"),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** POST /api/invoices/:id/mark-paid — set status Paid, set paidAt */
export async function markCoreInvoicePaid(id: string) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/mark-paid`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices"),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** POST /api/invoices/:id/cancel — set status Cancelled */
export async function cancelCoreInvoice(id: string) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices"),
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    }
  );
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/invoices/:id/export — ?format=csv (default) or pdf; PDF returns 501 */
export async function getCoreInvoiceExport(
  id: string,
  format: "csv" | "pdf" = "csv"
): Promise<{ ok: boolean; status: number; blob: Blob; filename?: string }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/invoices/${encodeURIComponent(id)}/export?format=${format}`;
  const res = await fetch(url, {
    method: "GET",
    headers: coreHeaders(`api/invoices/${id}/export`),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const disposition = res.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filename = filenameMatch ? filenameMatch[1].trim() : undefined;
  const blob = await res.blob();
  return { ok: res.ok, status: res.status, blob, filename };
}

// ——— Access API ———

/** GET /api/access — current API key context (platform vs merchant, key info, business). */
export async function getCoreAccess() {
  return fetchCoreGet<unknown>("api/access");
}

// ——— Connect (B2B) API ———

/** GET /api/connect/overview — B2B dashboard metrics (platform key only; 403 for merchant). */
export async function getCoreConnectOverview() {
  return fetchCoreGet<unknown>("api/connect/overview");
}

/** GET /api/connect/merchants — list merchants; query: page, limit, status, riskLevel. */
export async function getCoreConnectMerchants(params?: {
  page?: number;
  limit?: number;
  status?: string;
  riskLevel?: string;
}) {
  return fetchCoreGet<unknown[]>("api/connect/merchants", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    riskLevel: params?.riskLevel,
  });
}

/** GET /api/connect/merchants/:id — merchant detail (API keys, webhook, volume). */
export async function getCoreConnectMerchant(id: string) {
  return fetchCoreGet<unknown>(`api/connect/merchants/${encodeURIComponent(id)}`);
}

/** GET /api/connect/settlements — list payouts; query: page, limit, status. */
export async function getCoreConnectSettlements(params?: {
  page?: number;
  limit?: number;
  status?: string;
}) {
  return fetchCoreGet<unknown[]>("api/connect/settlements", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
  });
}

/** GET /api/connect/settlements/:id — payout detail (timeline, source transactions). */
export async function getCoreConnectSettlement(id: string) {
  return fetchCoreGet<unknown>(`api/connect/settlements/${encodeURIComponent(id)}`);
}

// ——— Platform Settings API ———

async function fetchCorePatch<T>(
  path: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: coreHeaders(path),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/settings/general */
export async function getCoreSettingsGeneral() {
  return fetchCoreGet<unknown>("api/settings/general");
}

/** PATCH /api/settings/general */
export async function patchCoreSettingsGeneral(body: Record<string, unknown>) {
  return fetchCorePatch<unknown>("api/settings/general", body);
}

/** GET /api/settings/financials */
export async function getCoreSettingsFinancials() {
  return fetchCoreGet<unknown>("api/settings/financials");
}

/** PATCH /api/settings/financials */
export async function patchCoreSettingsFinancials(body: Record<string, unknown>) {
  return fetchCorePatch<unknown>("api/settings/financials", body);
}

/** GET /api/settings/providers */
export async function getCoreSettingsProviders() {
  return fetchCoreGet<unknown>("api/settings/providers");
}

/** PATCH /api/settings/providers */
export async function patchCoreSettingsProviders(body: Record<string, unknown>) {
  return fetchCorePatch<unknown>("api/settings/providers", body);
}

/** PATCH /api/settings/providers/:id — set apiKey, enabled, priority */
export async function patchCoreSettingsProviderById(
  id: string,
  body: Record<string, unknown>
) {
  return fetchCorePatch<unknown>(
    `api/settings/providers/${encodeURIComponent(id)}`,
    body
  );
}

/** GET /api/settings/risk */
export async function getCoreSettingsRisk() {
  return fetchCoreGet<unknown>("api/settings/risk");
}

/** PATCH /api/settings/risk */
export async function patchCoreSettingsRisk(body: Record<string, unknown>) {
  return fetchCorePatch<unknown>("api/settings/risk", body);
}

/** GET /api/settings/team/admins */
export async function getCoreSettingsTeamAdmins() {
  return fetchCoreGet<unknown[]>("api/settings/team/admins");
}

/** POST /api/settings/team/invite */
export async function postCoreSettingsTeamInvite(body: {
  email: string;
  role?: string;
}) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/settings/team/invite`, {
    method: "POST",
    headers: coreHeaders("api/settings/team/invite"),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/settings/api */
export async function getCoreSettingsApi() {
  return fetchCoreGet<unknown>("api/settings/api");
}

/** PATCH /api/settings/api */
export async function patchCoreSettingsApi(body: Record<string, unknown>) {
  return fetchCorePatch<unknown>("api/settings/api", body);
}

/** POST /api/settings/api/rotate-webhook-secret */
export async function postCoreSettingsApiRotateWebhookSecret() {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/settings/api/rotate-webhook-secret`, {
    method: "POST",
    headers: coreHeaders("api/settings/api/rotate-webhook-secret"),
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/**
 * GET /api/logs — request logs from Core (monitoring & filtering).
 * Query: method, path (substring), since (ISO), page, limit (default 50, max 100).
 */
export async function getCoreLogs(params?: {
  method?: string;
  path?: string;
  since?: string;
  page?: number;
  limit?: number;
}) {
  const limit = params?.limit != null ? Math.min(100, Math.max(1, params.limit)) : 50;
  return fetchCoreGet<unknown[]>("api/logs", {
    method: params?.method,
    path: params?.path,
    since: params?.since,
    page: params?.page,
    limit,
  });
}

// ——— Webhooks (POST) ———

/**
 * Create order via Core webhook. Call from Backend/server only (e.g. API route or server action).
 * POST /webhook/order → 201 { success: true, data: { id, status, type } }
 */
export async function createOrder(
  body: CoreWebhookOrderBody
): Promise<
  | { success: true; data: CoreWebhookOrderSuccess["data"] }
  | { success: false; error: string; details?: CoreApiError["details"] }
> {
  try {
    const base = getCoreBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/webhook/order`, {
      method: "POST",
      headers: coreHeaders("/webhook/order"),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json()) as CoreWebhookOrderSuccess | CoreApiError;

    if (res.status === 201 && json.success && "data" in json) {
      return { success: true, data: json.data };
    }

    if ("success" in json && !json.success && "error" in json) {
      return {
        success: false,
        error: json.error,
        details: json.details,
      };
    }

    const err = json as unknown as CoreApiError;
    return {
      success: false,
      error: err.error ?? "Something went wrong.",
      details: err.details,
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { success: false, error: message };
  }
}

/**
 * Send event/data to admin dashboard. Core POSTs to ADMIN_WEBHOOK_URL and triggers Pusher admin-dashboard / admin-event.
 * POST /webhook/admin → 202 { success: true, data: { accepted: true, event } }
 */
export async function sendAdminWebhook(
  body: CoreAdminWebhookBody
): Promise<
  | { success: true; data: CoreAdminWebhookSuccess["data"] }
  | { success: false; error: string }
> {
  try {
    const base = getCoreBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/webhook/admin`, {
      method: "POST",
      headers: coreHeaders("/webhook/admin"),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json()) as CoreAdminWebhookSuccess | CoreApiError;

    if (res.status === 202 && json.success && "data" in json) {
      return { success: true, data: json.data };
    }
    const err = json as unknown as CoreApiError;
    return {
      success: false,
      error: err.error ?? "Something went wrong.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { success: false, error: message };
  }
}

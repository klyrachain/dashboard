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
  const fromPublic = process.env.NEXT_PUBLIC_CORE_URL?.trim();
  const fromServer = process.env.CORE_URL?.trim();
  const resolved = fromPublic || fromServer;
  if (!resolved) {
    throw new Error("Core API base URL is not configured. Set NEXT_PUBLIC_CORE_URL or CORE_URL.");
  }
  return resolved;
}

/** API key for protected routes (server-only; do not use NEXT_PUBLIC_). */
function getCoreApiKey(): string | undefined {
  return process.env.CORE_API_KEY?.trim() || undefined;
}

/** Paths that skip auth (public). Everything else requires Bearer (session) or x-api-key (platform). */
function isPublicPath(path: string): boolean {
  const pathname = path.replace(/\?.*$/, "").replace(/^\//, "").toLowerCase();
  return (
    pathname === "health" ||
    pathname === "ready" ||
    pathname.startsWith("api/quote")
  );
}

function requiresBearerForBusinessPath(path: string): boolean {
  const pathname = path.replace(/\?.*$/, "").replace(/^\//, "").toLowerCase();
  return (
    pathname.startsWith("api/invoices") ||
    pathname.startsWith("api/transactions") ||
    pathname.startsWith("api/requests")
  );
}

/** Optional session key for Core API. When set, use Authorization: Bearer; else x-api-key for non-public paths. */
export type CoreAuthOptions = { bearerToken?: string | null };

function coreHeaders(path: string, bearerToken?: string | null, extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (!isPublicPath(path)) {
    if (bearerToken?.trim()) {
      headers["Authorization"] = `Bearer ${bearerToken.trim()}`;
    } else {
      if (requiresBearerForBusinessPath(path)) {
        // Server-side dashboard calls (e.g. RSC) may have CORE_API_KEY but no session; still allow platform key.
        const key = getCoreApiKey();
        if (key) headers["x-api-key"] = key;
        return headers;
      }
      const key = getCoreApiKey();
      if (key) headers["x-api-key"] = key;
    }
  }
  return headers;
}

async function fetchCore<T>(
  path: string,
  options?: RequestInit & { timeout?: number; bearerToken?: string | null }
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const { timeout: optsTimeout, bearerToken, headers: optionHeaders, ...rest } =
    options ?? {};
  const timeout = optsTimeout ?? HEALTH_TIMEOUT_MS;
  const res = await fetch(url, {
    ...rest,
    headers: coreHeaders(path, bearerToken, optionHeaders),
    signal: AbortSignal.timeout(timeout),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** GET request to Core fetch API; returns envelope { success, data, meta? }. */
async function fetchCoreGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  bearerToken?: string | null,
  extraHeaders?: HeadersInit
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
    { timeout: FETCH_TIMEOUT_MS, bearerToken, headers: extraHeaders }
  );
  return { ok, status, data: data as CoreFetchSuccess<T> | CoreApiError };
}

/** POST request to Core; returns envelope { success, data }. */
async function fetchCorePost<T>(
  path: string,
  body: Record<string, unknown>,
  bearerToken?: string | null
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "POST",
    headers: coreHeaders(path, bearerToken),
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
    const { ok: httpOk, data } = await fetchCore<CoreHealthResponse>("/ready");
    if (!httpOk) return { ok: false, error: "Core not reachable" };
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
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/users", {
    page: params?.page,
    limit: params?.limit,
  }, bearerToken);
}

export async function getCoreUser(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/users/${encodeURIComponent(id)}`, undefined, bearerToken);
}

export async function getCoreTransactions(params?: {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  f_chain?: string;
  t_chain?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/transactions", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    type: params?.type,
    f_chain: params?.f_chain,
    t_chain: params?.t_chain,
  }, bearerToken);
}

export async function getCoreTransaction(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/transactions/${encodeURIComponent(id)}`, undefined, bearerToken);
}

export async function getCoreRequests(
  params?: { page?: number; limit?: number },
  bearerToken?: string | null,
  extraHeaders?: HeadersInit
) {
  return fetchCoreGet<unknown[]>(
    "api/requests",
    {
      page: params?.page,
      limit: params?.limit,
    },
    bearerToken,
    extraHeaders
  );
}

export async function getCoreRequest(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/requests/${encodeURIComponent(id)}`, undefined, bearerToken);
}

export async function getCoreClaims(params?: {
  page?: number;
  limit?: number;
  status?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/claims", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
  }, bearerToken);
}

export async function getCoreClaim(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/claims/${encodeURIComponent(id)}`, undefined, bearerToken);
}

export async function getCoreWallets(params?: { page?: number; limit?: number }, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/wallets", {
    page: params?.page,
    limit: params?.limit,
  }, bearerToken);
}

export async function getCoreWallet(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/wallets/${encodeURIComponent(id)}`, undefined, bearerToken);
}

export async function getCoreInventory(params?: {
  page?: number;
  limit?: number;
  chain?: string;
  chainId?: number;
  address?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/inventory", {
    page: params?.page,
    limit: params?.limit,
    chain: params?.chain,
    chainId: params?.chainId,
    address: params?.address,
  }, bearerToken);
}

export async function getCoreInventoryAsset(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/inventory/${encodeURIComponent(id)}`, undefined, bearerToken);
}

/** Body for POST /api/inventory — create inventory asset. */
export type CreateCoreInventoryBody = {
  chain: string;
  address?: string;
  tokenAddress?: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
  walletAddress?: string;
  chainId?: number;
};

export async function postCoreInventory(body: CreateCoreInventoryBody, bearerToken?: string | null) {
  const payload: Record<string, unknown> = {
    chain: body.chain,
    balance: body.balance ?? "0",
  };
  if (body.address != null) payload.address = body.address;
  if (body.tokenAddress != null) payload.tokenAddress = body.tokenAddress;
  if (body.token != null) payload.token = body.token;
  if (body.symbol != null) payload.symbol = body.symbol;
  if (body.walletAddress != null) payload.walletAddress = body.walletAddress;
  if (body.chainId != null) payload.chainId = body.chainId;
  return fetchCorePost<unknown>("api/inventory", payload, bearerToken);
}

/** Body for PATCH /api/inventory/:id. */
export type UpdateCoreInventoryBody = {
  chain?: string;
  chainId?: number;
  address?: string;
  tokenAddress?: string;
  token?: string;
  symbol?: string;
  balance?: string | number;
};

export async function patchCoreInventory(id: string, body: UpdateCoreInventoryBody, bearerToken?: string | null) {
  const payload: Record<string, unknown> = {};
  if (body.chain != null) payload.chain = body.chain;
  if (body.chainId != null) payload.chainId = body.chainId;
  if (body.address != null) payload.address = body.address;
  if (body.tokenAddress != null) payload.tokenAddress = body.tokenAddress;
  if (body.token != null) payload.token = body.token;
  if (body.symbol != null) payload.symbol = body.symbol;
  if (body.balance != null) payload.balance = body.balance;
  return fetchCorePatch<unknown>(`api/inventory/${encodeURIComponent(id)}`, payload, bearerToken);
}

export async function deleteCoreInventory(id: string, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const path = `api/inventory/${encodeURIComponent(id)}`;
  const res = await fetch(`${base}/${path}`, {
    method: "DELETE",
    headers: coreHeaders(path, bearerToken),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/**
 * GET /api/inventory/history — list all inventory ledger (paginated).
 * Query: page, limit (default 20, max 100), assetId, chain.
 * Response: { success, data: [...], meta: { page, limit, total } }.
 * Each item: InventoryLedger (type ACQUIRED|DISPOSED|REBALANCE, quantity, pricePerTokenUsd, totalValueUsd, referenceId, counterparty).
 */
export async function getCoreInventoryHistoryList(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
}, bearerToken?: string | null) {
  const limit =
    params?.limit != null
      ? Math.min(100, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/inventory/history", {
    page: params?.page,
    limit: limit ?? 20,
    assetId: params?.assetId,
    chain: params?.chain,
  }, bearerToken);
}

/** GET /api/inventory/:id/history — history for one asset (legacy/per-asset). */
export async function getCoreInventoryHistory(
  id: string,
  params?: { page?: number; limit?: number },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown[]>(
    `api/inventory/${encodeURIComponent(id)}/history`,
    { page: params?.page, limit: params?.limit },
    bearerToken
  );
}

/** GET /api/inventory/:id/lots — lots for one asset (FIFO). Query: onlyAvailable? (OPEN + remainingQuantity > 0). Fields: originalQuantity, remainingQuantity, costPerTokenUsd, totalCostUsd, status (OPEN|DEPLETED). */
export async function getCoreInventoryLots(
  id: string,
  params?: { onlyAvailable?: boolean },
  bearerToken?: string | null
) {
  const onlyAvailable =
    params?.onlyAvailable === true ? "true" : params?.onlyAvailable === false ? "false" : undefined;
  return fetchCoreGet<unknown[]>(`api/inventory/${encodeURIComponent(id)}/lots`, {
    onlyAvailable,
  }, bearerToken);
}

/** GET /api/lots — list lots (pagination; filter: assetId?, chain?, onlyAvailable?). */
export async function getCoreLots(params?: {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
  onlyAvailable?: boolean;
}, bearerToken?: string | null) {
  const onlyAvailable =
    params?.onlyAvailable === true ? "true" : params?.onlyAvailable === false ? "false" : undefined;
  return fetchCoreGet<unknown[]>("api/lots", {
    page: params?.page,
    limit: params?.limit ?? 20,
    assetId: params?.assetId,
    chain: params?.chain,
    onlyAvailable,
  }, bearerToken);
}

/** GET /api/chains — list chains. chainId, name, icon. */
export async function getCoreChains(bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/chains", undefined, bearerToken);
}

/** GET /api/tokens — list supported tokens. Query: chain_id? */
export async function getCoreTokens(params?: { chain_id?: number }, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/tokens", {
    chain_id: params?.chain_id,
  }, bearerToken);
}

export async function getCoreCacheBalances(params?: { limit?: number }, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/cache/balances", {
    limit: params?.limit,
  }, bearerToken);
}

export async function getCoreCacheBalance(chain: string, token: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(
    `api/cache/balances/${encodeURIComponent(chain)}/${encodeURIComponent(token)}`,
    undefined,
    bearerToken
  );
}

export async function getCoreQueuePoll(params?: { limit?: number }, bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/queue/poll", { limit: params?.limit }, bearerToken);
}

// ——— Failed Order Validation API ———

/** GET /api/validation/failed — list failed validations (paginated). Query: page, limit (max 100), code. */
export async function getCoreValidationFailed(params?: {
  page?: number;
  limit?: number;
  code?: string;
}, bearerToken?: string | null) {
  const limit =
    params?.limit != null
      ? Math.min(100, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/validation/failed", {
    page: params?.page,
    limit: limit ?? 20,
    code: params?.code,
  }, bearerToken);
}

/** GET /api/validation/failed/recent — last N from Redis. Query: limit (max 200). */
export async function getCoreValidationFailedRecent(params?: { limit?: number }, bearerToken?: string | null) {
  const limit =
    params?.limit != null
      ? Math.min(200, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/validation/failed/recent", {
    limit: limit ?? 50,
  }, bearerToken);
}

/** GET /api/validation/failed/report — aggregated report. Query: days (1–90, default 7). */
export async function getCoreValidationFailedReport(params?: { days?: number }, bearerToken?: string | null) {
  const days =
    params?.days != null
      ? Math.min(90, Math.max(1, params.days))
      : undefined;
  return fetchCoreGet<unknown>("api/validation/failed/report", {
    days: days ?? 7,
  }, bearerToken);
}

// ——— Invoices API ———

/** GET /api/invoices — list with ?page, ?limit (default 20, max 100), ?status */
export async function getCoreInvoices(params?: {
  page?: number;
  limit?: number;
  status?: string;
}, bearerToken?: string | null) {
  const limit =
    params?.limit != null
      ? Math.min(100, Math.max(1, params.limit))
      : undefined;
  return fetchCoreGet<unknown[]>("api/invoices", {
    page: params?.page,
    limit: limit ?? 20,
    status: params?.status,
  }, bearerToken);
}

/** GET /api/invoices/:id — full invoice; 404 if not found */
export async function getCoreInvoice(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/invoices/${encodeURIComponent(id)}`, undefined, bearerToken);
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

/** JSON body for POST /api/invoices (server Core + dashboard `/api/invoices` proxy). */
export function buildCreateCoreInvoiceRequestPayload(
  body: CreateCoreInvoiceBody
): Record<string, unknown> {
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
  return payload;
}

/** POST /api/invoices — create; required: billedTo, subject, dueDate, lineItems; optional sendNow. Normalizes line item amount to qty×unitPrice when missing. */
export async function createCoreInvoice(body: CreateCoreInvoiceBody, bearerToken?: string | null) {
  const payload = buildCreateCoreInvoiceRequestPayload(body);

  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/invoices`, {
    method: "POST",
    headers: coreHeaders("api/invoices", bearerToken),
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
  },
  bearerToken?: string | null
) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/invoices/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: coreHeaders("api/invoices", bearerToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as
    | CoreFetchSuccess<unknown>
    | CoreApiError;
  return { ok: res.ok, status: res.status, data };
}

/** POST /api/invoices/:id/send — send/resend; optional toEmail */
export async function sendCoreInvoice(id: string, toEmail?: string, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/send`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices", bearerToken),
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
export async function duplicateCoreInvoice(id: string, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/duplicate`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices", bearerToken),
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
export async function markCoreInvoicePaid(id: string, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/mark-paid`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices", bearerToken),
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
export async function cancelCoreInvoice(id: string, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(
    `${base}/api/invoices/${encodeURIComponent(id)}/cancel`,
    {
      method: "POST",
      headers: coreHeaders("api/invoices", bearerToken),
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
  format: "csv" | "pdf" = "csv",
  bearerToken?: string | null
): Promise<{ ok: boolean; status: number; blob: Blob; filename?: string }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}/api/invoices/${encodeURIComponent(id)}/export?format=${format}`;
  const res = await fetch(url, {
    method: "GET",
    headers: coreHeaders(`api/invoices/${id}/export`, bearerToken),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const contentType = res.headers.get("content-type") ?? "";
  const disposition = res.headers.get("content-disposition") ?? "";
  const filenameMatch = disposition.match(/filename="?([^";\n]+)"?/);
  const filenameFromHeader = filenameMatch ? filenameMatch[1].trim() : undefined;
  const filename =
    filenameFromHeader ??
    (contentType.includes("pdf")
      ? `invoice-${id}.pdf`
      : contentType.includes("csv") || contentType.includes("text/")
        ? `invoice-${id}.csv`
        : undefined);
  const blob = await res.blob();
  return { ok: res.ok, status: res.status, blob, filename };
}

// ——— Access API ———

/** GET /api/access — current API key context (platform vs merchant, key info, business). */
export async function getCoreAccess(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/access", undefined, bearerToken);
}

// ——— Provider Routing API ———

/** GET /api/providers — list all providers (routing table). Ordered by priority desc, then code. */
export async function getCoreProviders(bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/providers", undefined, bearerToken);
}

/** GET /api/providers/:id — one provider by UUID. */
export async function getCoreProviderById(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/providers/${encodeURIComponent(id)}`, undefined, bearerToken);
}

/** Body for PATCH /api/providers/:id — status, operational, enabled, priority, fee, name. */
export type UpdateCoreProviderBody = {
  status?: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  operational?: boolean;
  enabled?: boolean;
  priority?: number;
  fee?: number | null;
  name?: string | null;
};

/** PATCH /api/providers/:id — update provider. */
export async function patchCoreProvider(id: string, body: UpdateCoreProviderBody, bearerToken?: string | null) {
  const payload: Record<string, unknown> = {};
  if (body.status != null) payload.status = body.status;
  if (body.operational != null) payload.operational = body.operational;
  if (body.enabled != null) payload.enabled = body.enabled;
  if (body.priority != null) payload.priority = body.priority;
  if (body.fee !== undefined) payload.fee = body.fee;
  if (body.name !== undefined) payload.name = body.name;
  return fetchCorePatch<unknown>(`api/providers/${encodeURIComponent(id)}`, payload, bearerToken);
}

/** POST /api/providers/:id/rotate-key — set/rotate API key. Body: { apiKey }. */
export async function postCoreProviderRotateKey(id: string, body: { apiKey: string }, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const path = `api/providers/${encodeURIComponent(id)}/rotate-key`;
  const res = await fetch(`${base}/${path}`, {
    method: "POST",
    headers: coreHeaders(path, bearerToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

// ——— Platform API (platform-wide dashboard) ———

/** GET /api/platform/overview — platform-wide analytics. Query: startDate, endDate (YYYY-MM-DD, inclusive UTC). */
export async function getCorePlatformOverview(
  params?: { startDate?: string; endDate?: string },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown>("api/platform/overview", {
    startDate: params?.startDate,
    endDate: params?.endDate,
  }, bearerToken);
}

// ——— Connect (B2B) API ———

/** GET /api/connect/overview — B2B dashboard metrics. */
export async function getCoreConnectOverview(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/connect/overview", undefined, bearerToken);
}

/** GET /api/connect/fees/report — accumulated fees by currency; query: days, businessId. */
export async function getCoreConnectFeesReport(params?: {
  days?: string | number;
  businessId?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/connect/fees/report", {
    days: params?.days != null ? String(params.days) : undefined,
    businessId: params?.businessId,
  }, bearerToken);
}

/** GET /api/connect/merchants — list merchants; query: page, limit, status, riskLevel. */
export async function getCoreConnectMerchants(params?: {
  page?: number;
  limit?: number;
  status?: string;
  riskLevel?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/connect/merchants", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    riskLevel: params?.riskLevel,
  }, bearerToken);
}

/** GET /api/connect/merchants/:id — merchant detail (API keys, webhook, volume). */
export async function getCoreConnectMerchant(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/connect/merchants/${encodeURIComponent(id)}`, undefined, bearerToken);
}

/** GET /api/connect/settlements — list payouts; query: page, limit, status. */
export async function getCoreConnectSettlements(params?: {
  page?: number;
  limit?: number;
  status?: string;
}, bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/connect/settlements", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
  }, bearerToken);
}

/** GET /api/connect/settlements/:id — payout detail (timeline, source transactions). */
export async function getCoreConnectSettlement(id: string, bearerToken?: string | null) {
  return fetchCoreGet<unknown>(`api/connect/settlements/${encodeURIComponent(id)}`, undefined, bearerToken);
}

/** GET /api/admin/peer-ramp-app/kyc/users — ramp consumers + portal users (platform verification queue). */
export async function getCoreAdminPeerRampKycUsers(
  params?: { q?: string; limit?: number },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown>("api/admin/peer-ramp-app/kyc/users", {
    q: params?.q,
    limit: params?.limit,
  }, bearerToken);
}

/** POST /api/admin/peer-ramp-app/kyc/reset — clear KYC + sessions (per email; ramp or portal row). */
export async function postCoreAdminPeerRampKycReset(
  body: { email: string },
  bearerToken?: string | null
) {
  return fetchCorePost<unknown>("api/admin/peer-ramp-app/kyc/reset", body, bearerToken);
}

/** POST /api/admin/peer-ramp-app/kyc/override — DB-only approved|declined (admin_manual). */
export async function postCoreAdminPeerRampKycOverride(
  body: { email: string; status: "approved" | "declined" },
  bearerToken?: string | null
) {
  return fetchCorePost<unknown>("api/admin/peer-ramp-app/kyc/override", body, bearerToken);
}

/** GET /api/admin/businesses/kyb */
export async function getCoreAdminBusinessesKyb(
  params?: { q?: string; limit?: number },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown>("api/admin/businesses/kyb", {
    q: params?.q,
    limit: params?.limit,
  }, bearerToken);
}

/** POST /api/admin/businesses/kyb/reset */
export async function postCoreAdminBusinessKybReset(
  body: { businessId: string },
  bearerToken?: string | null
) {
  return fetchCorePost<unknown>("api/admin/businesses/kyb/reset", body, bearerToken);
}

/** POST /api/admin/businesses/kyb/override */
export async function postCoreAdminBusinessKybOverride(
  body: { businessId: string; status: "approved" | "declined" },
  bearerToken?: string | null
) {
  return fetchCorePost<unknown>("api/admin/businesses/kyb/override", body, bearerToken);
}

// ——— Platform Settings API ———

async function fetchCorePatch<T>(
  path: string,
  body: Record<string, unknown>,
  bearerToken?: string | null
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: coreHeaders(path, bearerToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/settings/general */
export async function getCoreSettingsGeneral(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/settings/general", undefined, bearerToken);
}

/** PATCH /api/settings/general */
export async function patchCoreSettingsGeneral(body: Record<string, unknown>, bearerToken?: string | null) {
  return fetchCorePatch<unknown>("api/settings/general", body, bearerToken);
}

/** GET /api/settings/financials */
export async function getCoreSettingsFinancials(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/settings/financials", undefined, bearerToken);
}

/** PATCH /api/settings/financials */
export async function patchCoreSettingsFinancials(body: Record<string, unknown>, bearerToken?: string | null) {
  return fetchCorePatch<unknown>("api/settings/financials", body, bearerToken);
}

/** GET /api/settings/providers */
export async function getCoreSettingsProviders(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/settings/providers", undefined, bearerToken);
}

/** PATCH /api/settings/providers */
export async function patchCoreSettingsProviders(body: Record<string, unknown>, bearerToken?: string | null) {
  return fetchCorePatch<unknown>("api/settings/providers", body, bearerToken);
}

/** PATCH /api/settings/providers/:id — set apiKey, enabled, priority */
export async function patchCoreSettingsProviderById(
  id: string,
  body: Record<string, unknown>,
  bearerToken?: string | null
) {
  return fetchCorePatch<unknown>(
    `api/settings/providers/${encodeURIComponent(id)}`,
    body,
    bearerToken
  );
}

/** GET /api/settings/risk */
export async function getCoreSettingsRisk(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/settings/risk", undefined, bearerToken);
}

/** PATCH /api/settings/risk */
export async function patchCoreSettingsRisk(body: Record<string, unknown>, bearerToken?: string | null) {
  return fetchCorePatch<unknown>("api/settings/risk", body, bearerToken);
}

/** GET /api/settings/team/admins */
export async function getCoreSettingsTeamAdmins(bearerToken?: string | null) {
  return fetchCoreGet<unknown[]>("api/settings/team/admins", undefined, bearerToken);
}

/** POST /api/settings/team/invite */
export async function postCoreSettingsTeamInvite(body: {
  email: string;
  role?: string;
}, bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/settings/team/invite`, {
    method: "POST",
    headers: coreHeaders("api/settings/team/invite", bearerToken),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/settings/api */
export async function getCoreSettingsApi(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/settings/api", undefined, bearerToken);
}

/** PATCH /api/settings/api */
export async function patchCoreSettingsApi(body: Record<string, unknown>, bearerToken?: string | null) {
  return fetchCorePatch<unknown>("api/settings/api", body, bearerToken);
}

/** POST /api/settings/api/rotate-webhook-secret */
export async function postCoreSettingsApiRotateWebhookSecret(bearerToken?: string | null) {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const res = await fetch(`${base}/api/settings/api/rotate-webhook-secret`, {
    method: "POST",
    headers: coreHeaders("api/settings/api/rotate-webhook-secret", bearerToken),
    body: JSON.stringify({}),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  const data = (await res.json().catch(() => ({}))) as unknown;
  return { ok: res.ok, status: res.status, data };
}

/** GET /api/settings/quotes/fonbnk/supported — Fonbnk NETWORK_ASSET rows (admin). */
export async function getCoreSettingsQuotesFonbnkSupported(
  params?: { limit?: number; network?: string },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown>("api/settings/quotes/fonbnk/supported", {
    limit: params?.limit,
    network: params?.network,
  }, bearerToken);
}

/** GET /api/countries — optional ?supported=fonbnk|paystack|any */
export async function getCoreCountries(
  params?: { supported?: "fonbnk" | "paystack" | "any" },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown>("api/countries", { supported: params?.supported }, bearerToken);
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
}, bearerToken?: string | null) {
  const limit = params?.limit != null ? Math.min(100, Math.max(1, params.limit)) : 50;
  return fetchCoreGet<unknown[]>("api/logs", {
    method: params?.method,
    path: params?.path,
    since: params?.since,
    page: params?.page,
    limit,
  }, bearerToken);
}

// ——— Webhooks (POST) ———

/**
 * Create order via Core webhook. Call from Backend/server only (e.g. API route or server action).
 * POST /webhook/order → 201 { success: true, data: { id, status, type } }
 */
export async function createOrder(
  body: CoreWebhookOrderBody,
  bearerToken?: string | null
): Promise<
  | { success: true; data: CoreWebhookOrderSuccess["data"] }
  | { success: false; error: string; details?: CoreApiError["details"] }
> {
  try {
    const base = getCoreBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${base}/webhook/order`, {
      method: "POST",
      headers: coreHeaders("/webhook/order", bearerToken),
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

/** GET /api/platform/gas/settings */
export async function getCorePlatformGasSettings(bearerToken?: string | null) {
  return fetchCoreGet<unknown>("api/platform/gas/settings", undefined, bearerToken);
}

/** PATCH /api/platform/gas/settings */
export async function patchCorePlatformGasSettings(
  body: { sponsorshipEnabled?: boolean; maxUsdPerTx?: number | null; notes?: string | null },
  bearerToken?: string | null
) {
  return fetchCorePatch<unknown>("api/platform/gas/settings", body as Record<string, unknown>, bearerToken);
}

/** GET /api/platform/gas/businesses — paginated business gas accounts. */
export async function getCorePlatformGasBusinesses(
  params?: { page?: number; limit?: number },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown[]>("api/platform/gas/businesses", {
    page: params?.page,
    limit: params?.limit,
  }, bearerToken);
}

/** GET /api/platform/gas/ledger — paginated ledger (optional reason e.g. SPONSORSHIP). */
export async function getCorePlatformGasLedger(
  params?: { page?: number; limit?: number; reason?: string },
  bearerToken?: string | null
) {
  return fetchCoreGet<unknown[]>("api/platform/gas/ledger", {
    page: params?.page,
    limit: params?.limit,
    reason: params?.reason,
  }, bearerToken);
}

/** POST /api/platform/gas/credit — credit a business prepaid balance (admin). */
export async function postCorePlatformGasCredit(
  body: { businessId: string; amountUsd: number; idempotencyKey: string; reason?: string },
  bearerToken?: string | null
) {
  return fetchCorePost<unknown>("api/platform/gas/credit", body as Record<string, unknown>, bearerToken);
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

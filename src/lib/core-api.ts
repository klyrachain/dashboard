/**
 * Core API client — health, readiness, fetch API, and webhooks.
 * Base URL from NEXT_PUBLIC_CORE_URL (default dev: http://localhost:4000).
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

const DEFAULT_CORE_URL = "http://localhost:4000";
const HEALTH_TIMEOUT_MS = 5000;
const FETCH_TIMEOUT_MS = 15000;

export function getCoreBaseUrl(): string {
  return process.env.NEXT_PUBLIC_CORE_URL ?? DEFAULT_CORE_URL;
}

async function fetchCore<T>(
  path: string,
  options?: RequestInit & { timeout?: number }
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getCoreBaseUrl().replace(/\/$/, "");
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const timeout = options?.timeout ?? HEALTH_TIMEOUT_MS;
  const { timeout: _t, ...rest } = options ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...rest?.headers,
    },
    signal: AbortSignal.timeout(timeout),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

/** GET request to Core fetch API; returns envelope { success, data, meta? }. */
async function fetchCoreGet<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<{ ok: boolean; data: CoreFetchSuccess<T> | CoreApiError }> {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") search.set(k, String(v));
    }
  }
  const qs = search.toString();
  const fullPath = qs ? `${path}?${qs}` : path;
  const { ok, data } = await fetchCore<CoreFetchSuccess<T> | CoreApiError>(
    fullPath,
    { timeout: FETCH_TIMEOUT_MS }
  );
  return { ok, data: data as CoreFetchSuccess<T> | CoreApiError };
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
}) {
  return fetchCoreGet<unknown[]>("api/transactions", {
    page: params?.page,
    limit: params?.limit,
    status: params?.status,
    type: params?.type,
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
}) {
  return fetchCoreGet<unknown[]>("api/inventory", {
    page: params?.page,
    limit: params?.limit,
    chain: params?.chain,
  });
}

export async function getCoreInventoryAsset(id: string) {
  return fetchCoreGet<unknown>(`api/inventory/${encodeURIComponent(id)}`);
}

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
      headers: { "Content-Type": "application/json" },
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

    return {
      success: false,
      error: (json as CoreApiError).error ?? "Something went wrong.",
      details: (json as CoreApiError).details,
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
    const json = (await res.json()) as CoreAdminWebhookSuccess | CoreApiError;

    if (res.status === 202 && json.success && "data" in json) {
      return { success: true, data: json.data };
    }
    return {
      success: false,
      error: (json as CoreApiError).error ?? "Something went wrong.",
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { success: false, error: message };
  }
}

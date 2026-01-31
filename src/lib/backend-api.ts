/**
 * Backend API client — chains and tokens for swap quotes.
 * Base URL from BACKEND_URL. Used to resolve chain IDs and token addresses
 * so swap quote requests use chain id + token address (required by quote API).
 * @see md/quotes-integration.md
 */

const FETCH_TIMEOUT_MS = 15000;

export function getBackendBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "");
  if (!url) return "";
  return url;
}

export type BackendChain = {
  chainId: string;
  networkName: string;
  chainIconURI?: string;
};

export type BackendToken = {
  chainId: string;
  networkName: string;
  chainIconURI?: string;
  address: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
};

async function fetchBackend<T>(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const base = getBackendBaseUrl();
  if (!base) {
    return { ok: false, status: 0, data: [] as T };
  }
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const data = (await res.json().catch(() => null)) as T;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: [] as T };
  }
}

/**
 * GET /api/squid/chains — supported chains (chainId, networkName, chainIconURI).
 * Query: testnet=1 or testnet=true for testnet chains.
 */
export async function getBackendChains(params?: {
  testnet?: boolean;
}): Promise<BackendChain[]> {
  const search = new URLSearchParams();
  if (params?.testnet) search.set("testnet", "1");
  const qs = search.toString();
  const path = qs ? `api/squid/chains?${qs}` : "api/squid/chains";
  const { ok, data } = await fetchBackend<BackendChain[] | { success?: boolean; error?: string }>(path);
  if (!ok || !data) return [];
  if (Array.isArray(data)) return data;
  return [];
}

/**
 * GET /api/squid/tokens — supported tokens with chain info.
 * Query: testnet=1 or testnet=true for testnet tokens.
 */
export async function getBackendTokens(params?: {
  testnet?: boolean;
}): Promise<BackendToken[]> {
  const search = new URLSearchParams();
  if (params?.testnet) search.set("testnet", "1");
  const qs = search.toString();
  const path = qs ? `api/squid/tokens?${qs}` : "api/squid/tokens";
  const { ok, data } = await fetchBackend<BackendToken[] | { success?: boolean; error?: string }>(path);
  if (!ok || !data) return [];
  if (Array.isArray(data)) return data;
  return [];
}

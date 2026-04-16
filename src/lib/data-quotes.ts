/**
 * Quotes page data: token pairs (via transformer + BACKEND_URL chains/tokens) and swap quotes (Core API).
 * Pairs: raw list from Core transactions → resolved with chain ID + token address via backend chains/tokens.
 * Quotes: POST api/quote/swap (single provider) or api/quote/best; chain id + token address required.
 * @see md/quotes-integration.md, md/quote-api.md
 */

import { getSessionToken } from "@/lib/auth";
import {
  getCoreTransactions,
  getCoreInventory,
  postCoreQuoteSwap,
  postCoreQuoteBest,
} from "@/lib/core-api";
import { getBackendChains, getBackendTokens, type BackendChain, type BackendToken } from "@/lib/backend-api";
import { expandPairs, type RawPair } from "@/lib/quotes-pair-transformer";

/** One inventory asset from GET /api/inventory (chainId, tokenAddress, symbol, address, wallet). */
export type InventoryAssetForQuote = {
  id: string;
  chainId: number;
  tokenAddress: string;
  symbol: string;
  chain: string;
  address: string;
  walletId: string | null;
  walletAddress: string | null;
};

/** Token pair for quote: from/to token contract addresses and chain IDs from inventory. */
export type TokenPair = {
  fromToken: string;
  toToken: string;
  fromChain: string;
  toChain: string;
  fromChainId: number;
  toChainId: number;
  fromAddress: string;
  toAddress: string;
  label: string;
  count: number;
};

/** Context built from GET /api/inventory for resolving tokens and quote from_address. */
export type InventoryQuoteContext = {
  /** Key: `${chainId}:${symbol}` (uppercase) -> tokenAddress. */
  tokenByChainAndSymbol: Map<string, string>;
  /** Chain display name (e.g. BASE, ETHEREUM) -> chainId. */
  chainNameToId: Map<string, number>;
  /** First wallet address from inventory (for quote from_address); null if none. */
  firstWalletAddress: string | null;
};

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Fixed wallet address used for quote from_address / to_address (required by Squid/LiFi). */
export const QUOTE_FROM_ADDRESS = "0x9f08eFb0767Bf180B8b8094FaaEF9DAB5a0755e1";

function isEvmAddress(s: string): boolean {
  return EVM_ADDRESS_REGEX.test(String(s).trim());
}

/** Native ETH sentinel (lowercase); valid for quote API. */
const NATIVE_ETH_ADDRESS_LC = "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee";

function isValidQuoteTokenAddress(s: string): boolean {
  const t = String(s).trim().toLowerCase();
  return EVM_ADDRESS_REGEX.test(t) || t === NATIVE_ETH_ADDRESS_LC;
}

/** Parse one inventory item from API (chainId, tokenAddress, symbol, address, wallet). */
function parseInventoryAsset(item: unknown): InventoryAssetForQuote | null {
  if (!item || typeof item !== "object") return null;
  const o = item as Record<string, unknown>;
  const id = typeof o.id === "string" ? o.id : "";
  if (!id) return null;
  const chainId = typeof o.chainId === "number" ? o.chainId : Number(o.chainId);
  const tokenAddress = String(o.tokenAddress ?? "").trim();
  const symbol = String(o.symbol ?? o.token ?? "").trim().toUpperCase();
  const chain = String(o.chain ?? "").trim();
  const address = String(o.address ?? "").trim();
  const walletId = o.walletId != null ? String(o.walletId) : null;
  const wallet = o.wallet as Record<string, unknown> | undefined;
  const walletAddress =
    wallet && typeof wallet.address === "string"
      ? (wallet.address as string).trim()
      : null;
  if (!chainId || !tokenAddress || !isEvmAddress(tokenAddress)) return null;
  return {
    id,
    chainId,
    tokenAddress,
    symbol,
    chain,
    address,
    walletId: walletId || null,
    walletAddress,
  };
}

/**
 * Fetch GET /api/inventory and build context: (chainId, symbol) -> tokenAddress,
 * chain name -> chainId, and first wallet address for quote from_address.
 * Uses chainId, tokenAddress, symbol, address, and wallet from each asset.
 */
export async function getInventoryQuoteContext(): Promise<InventoryQuoteContext> {
  const tokenByChainAndSymbol = new Map<string, string>();
  const chainNameToId = new Map<string, number>();
  let firstWalletAddress: string | null = null;

  try {
    const token = await getSessionToken();
    const result = await getCoreInventory({ limit: 200, page: 1 }, token ?? undefined);
    if (!result.ok || !result.data || typeof result.data !== "object") {
      return { tokenByChainAndSymbol, chainNameToId, firstWalletAddress };
    }
    const envelope = result.data as { success?: boolean; data?: unknown[] };
    const list = Array.isArray(envelope?.data) ? envelope.data : [];

    for (const item of list) {
      const asset = parseInventoryAsset(item);
      if (!asset) continue;

      if (asset.chain) chainNameToId.set(asset.chain.toUpperCase(), asset.chainId);
      if (asset.symbol) {
        tokenByChainAndSymbol.set(`${asset.chainId}:${asset.symbol}`, asset.tokenAddress);
      }

      if (!firstWalletAddress && asset.walletAddress && isEvmAddress(asset.walletAddress)) {
        firstWalletAddress = asset.walletAddress;
      }
      if (!firstWalletAddress && asset.address && isEvmAddress(asset.address)) {
        firstWalletAddress = asset.address;
      }
    }
  } catch {
    // Core unavailable
  }

  return { tokenByChainAndSymbol, chainNameToId, firstWalletAddress };
}

/** Default amount in wei for "1 unit": 1e6 for USDC/USDT, 1e18 for others. */
function defaultAmountWei(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "USDC" || s === "USDT") return "1000000";
  return "1000000000000000000";
}

/** Build raw pair list from Core transactions (symbol + chain name, count). */
async function getRawPairsFromTransactions(limit: number): Promise<RawPair[]> {
  const pairCounts = new Map<
    string,
    { count: number; from: string; to: string; fromChain: string; toChain: string }
  >();

  try {
    const token = await getSessionToken();
    const result = await getCoreTransactions({ limit: 500, page: 1 }, token ?? undefined);
    const raw =
      result.ok &&
        result.data &&
        typeof result.data === "object" &&
        Array.isArray((result.data as { data?: unknown[] }).data)
        ? (result.data as { data: unknown[] }).data
        : [];

    for (const item of raw) {
      const o = item as Record<string, unknown>;
      const fromToken = String(o.fromToken ?? o.f_token ?? "").trim();
      const toToken = String(o.toToken ?? o.t_token ?? "").trim();
      const fromChain = String(o.fromChain ?? o.f_chain ?? "BASE").trim();
      const toChain = String(o.toChain ?? o.t_chain ?? "BASE").trim();
      if (!fromToken || !toToken) continue;
      if (
        fromToken.toUpperCase() === toToken.toUpperCase() &&
        fromChain === toChain
      )
        continue;

      const key = `${fromChain}:${fromToken}:${toChain}:${toToken}`.toLowerCase();
      const existing = pairCounts.get(key);
      if (existing) existing.count += 1;
      else
        pairCounts.set(key, {
          count: 1,
          from: fromToken,
          to: toToken,
          fromChain,
          toChain,
        });
    }
  } catch {
    // Core unavailable
  }

  const sorted = [...pairCounts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, limit);

  const fallbackPairs: RawPair[] = [
    { from: "USDC", to: "ETH", fromChain: "BASE", toChain: "BASE", count: 0 },
    { from: "USDC", to: "USDT", fromChain: "BASE", toChain: "BASE", count: 0 },
    { from: "ETH", to: "USDC", fromChain: "BASE", toChain: "BASE", count: 0 },
    { from: "USDC", to: "ETH", fromChain: "ETHEREUM", toChain: "ETHEREUM", count: 0 },
  ];

  const toExpand =
    sorted.length >= limit
      ? sorted.map(([, v]) => v)
      : [
        ...sorted.map(([, v]) => v),
        ...fallbackPairs.slice(0, limit - sorted.length),
      ];

  return toExpand.map((p) => ({
    ...p,
    count: pairCounts.get(
      `${p.fromChain}:${p.from}:${p.toChain}:${p.to}`.toLowerCase()
    )?.count ?? 0,
  }));
}

/**
 * Derive most-traded token pairs from transactions, resolving to chainId and tokenAddress
 * using BACKEND_URL chains/tokens. Only includes pairs where both tokens resolve.
 */
export async function getMostTradedPairs(limit: number = 8): Promise<TokenPair[]> {
  const { pairs } = await getChainsTokensAndPairs(limit);
  return pairs;
}

/**
 * Fetch chains and tokens from BACKEND_URL and resolve pairs for the quotes page.
 * Use this on connect/quotes so the page has chains, tokens, and pairs in one place.
 */
export async function getChainsTokensAndPairs(limit: number = 8): Promise<{
  chains: BackendChain[];
  tokens: BackendToken[];
  pairs: TokenPair[];
}> {
  const [chains, tokens, rawPairs] = await Promise.all([
    getBackendChains(),
    getBackendTokens(),
    getRawPairsFromTransactions(limit),
  ]);
  const pairs = expandPairs(rawPairs, chains, tokens);
  return { chains, tokens, pairs };
}

export type QuoteData = {
  provider?: string;
  from_amount: string;
  to_amount: string;
  from_chain_id: number;
  to_chain_id: number;
  cross_chain: boolean;
  estimated_duration_seconds?: number | null;
};

export type QuoteResult = {
  pair: TokenPair;
  ok: boolean;
  data?: QuoteData | null;
  error?: string;
};

/** Supported swap quote provider: single provider or "best" (backend picks best rate). */
export type SwapQuoteProvider = "0x" | "squid" | "lifi" | "best";

/**
 * Fetch swap quote for one pair. Uses chain id + token address (required by quote API).
 * Does not call the API if either token address is missing or invalid.
 * provider "best" → POST api/quote/best; otherwise POST api/quote/swap with that provider.
 */
export async function getQuoteForPair(
  pair: TokenPair,
  amountWei?: string,
  fromAddress?: string | null,
  provider: SwapQuoteProvider = "squid"
): Promise<QuoteResult> {
  if (!isValidQuoteTokenAddress(pair.fromAddress) || !isValidQuoteTokenAddress(pair.toAddress)) {
    return { pair, ok: false, error: "Token address required (resolve from chains/tokens)." };
  }

  const amount = amountWei ?? defaultAmountWei(pair.fromToken);
  const resolvedFrom =
    fromAddress && isEvmAddress(fromAddress)
      ? fromAddress
      : QUOTE_FROM_ADDRESS;

  try {
    if (provider === "best") {
      const res = await postCoreQuoteBest({
        from_token: pair.fromAddress,
        to_token: pair.toAddress,
        amount,
        from_chain: pair.fromChainId,
        to_chain: pair.toChainId,
        from_address: resolvedFrom,
      });
      if (!res.ok || !res.data || typeof res.data !== "object") {
        const err =
          res.data &&
            typeof res.data === "object" &&
            "error" in res.data
            ? String((res.data as { error: string }).error)
            : "Quote failed";
        return { pair, ok: false, error: err };
      }
      const envelope = res.data as { success?: boolean; data?: { best?: QuoteData } };
      const quote = envelope?.data?.best;
      if (!quote) return { pair, ok: false, error: "No quote data" };
      return { pair, ok: true, data: quote };
    }

    const res = await postCoreQuoteSwap({
      provider,
      from_token: pair.fromAddress,
      to_token: pair.toAddress,
      amount,
      from_chain: pair.fromChainId,
      to_chain: pair.toChainId,
      from_address: resolvedFrom,
    });

    if (!res.ok || !res.data || typeof res.data !== "object") {
      const err =
        res.data &&
          typeof res.data === "object" &&
          "error" in res.data
          ? String((res.data as { error: string }).error)
          : "Quote failed";
      return { pair, ok: false, error: err };
    }

    const envelope = res.data as { success?: boolean; data?: QuoteData };
    const quote = envelope?.data;
    if (!quote) return { pair, ok: false, error: "No quote data" };

    return { pair, ok: true, data: quote };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { pair, ok: false, error: message };
  }
}

/** Delay helper for throttling. */
function delayMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Throttle: ms between each quote request to avoid "too many requests" / DoS. One request at a time with cooldown. */
const QUOTE_THROTTLE_MS = 2000;

/**
 * Fetch quotes for multiple pairs; one request per pair, with cooldown between requests.
 * Uses fixed from_address (QUOTE_FROM_ADDRESS). Pairs without valid token addresses are skipped (no request).
 */
export async function getQuotesForPairs(
  pairs: TokenPair[],
  amountWei?: string,
  provider: SwapQuoteProvider = "squid"
): Promise<QuoteResult[]> {
  const results: QuoteResult[] = [];
  for (let i = 0; i < pairs.length; i++) {
    if (i > 0) await delayMs(QUOTE_THROTTLE_MS);
    results.push(await getQuoteForPair(pairs[i], amountWei, QUOTE_FROM_ADDRESS, provider));
  }
  return results;
}

/**
 * Quotes page data: token pairs and quotes using inventory (chainId, tokenAddress, symbol, address).
 * Inventory from GET /api/inventory; pairs from transactions; quotes from POST api/quote/swap.
 */

import {
  getCoreTransactions,
  getCoreInventory,
  postCoreQuoteSwap,
} from "@/lib/core-api";

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

function isEvmAddress(s: string): boolean {
  return EVM_ADDRESS_REGEX.test(String(s).trim());
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
    const result = await getCoreInventory({ limit: 200, page: 1 });
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

function resolveChainId(chainName: string, ctx: InventoryQuoteContext): number {
  const key = chainName.trim().toUpperCase();
  return ctx.chainNameToId.get(key) ?? 8453;
}

function resolveTokenAddress(
  chainId: number,
  symbol: string,
  ctx: InventoryQuoteContext
): string {
  const key = `${chainId}:${symbol.trim().toUpperCase()}`;
  return ctx.tokenByChainAndSymbol.get(key) ?? symbol;
}

/** Default amount in wei for "1 unit": 1e6 for USDC/USDT, 1e18 for others. */
function defaultAmountWei(symbol: string): string {
  const s = symbol.toUpperCase();
  if (s === "USDC" || s === "USDT") return "1000000";
  return "1000000000000000000";
}

/**
 * Derive most-traded token pairs from transactions, resolving to chainId and tokenAddress
 * using inventory. Only includes pairs where both tokens exist in inventory.
 */
export async function getMostTradedPairs(limit: number = 8): Promise<TokenPair[]> {
  const ctx = await getInventoryQuoteContext();
  const pairCounts = new Map<
    string,
    { count: number; from: string; to: string; fromChain: string; toChain: string }
 >();

  try {
    const result = await getCoreTransactions({ limit: 500, page: 1 });
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

  const fallbackPairs: Array<{
    from: string;
    to: string;
    fromChain: string;
    toChain: string;
  }> = [
    { from: "USDC", to: "ETH", fromChain: "BASE", toChain: "BASE" },
    { from: "USDC", to: "USDT", fromChain: "BASE", toChain: "BASE" },
    { from: "ETH", to: "USDC", fromChain: "BASE", toChain: "BASE" },
    { from: "USDC", to: "ETH", fromChain: "ETHEREUM", toChain: "ETHEREUM" },
  ];

  const toExpand =
    sorted.length >= limit
      ? sorted.map(([, v]) => v)
      : [
          ...sorted.map(([, v]) => v),
          ...fallbackPairs.slice(0, limit - sorted.length),
        ];

  const expanded: TokenPair[] = [];
  const seen = new Set<string>();

  for (const p of toExpand) {
    const fromChainId = resolveChainId(p.fromChain, ctx);
    const toChainId = resolveChainId(p.toChain, ctx);
    const fromAddress = resolveTokenAddress(fromChainId, p.from, ctx);
    const toAddress = resolveTokenAddress(toChainId, p.to, ctx);
    if (!isEvmAddress(fromAddress) || !isEvmAddress(toAddress)) continue;

    const labelKey = `${p.from}/${p.to}`.toLowerCase();
    if (seen.has(labelKey)) continue;
    seen.add(labelKey);

    const pairKey = `${p.fromChain}:${p.from}:${p.toChain}:${p.to}`.toLowerCase();
    const count = pairCounts.get(pairKey)?.count ?? 0;

    expanded.push({
      fromToken: p.from,
      toToken: p.to,
      fromChain: p.fromChain,
      toChain: p.toChain,
      fromChainId,
      toChainId,
      fromAddress,
      toAddress,
      label: `${p.from}/${p.to}`,
      count,
    });
  }

  return expanded;
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

/**
 * Fetch swap quote for one pair via POST api/quote/swap (provider: squid).
 * Uses from_token, to_token = pair.fromAddress, pair.toAddress (inventory tokenAddress);
 * from_chain, to_chain = pair.fromChainId, pair.toChainId; from_address from inventory or zero.
 */
export async function getQuoteForPair(
  pair: TokenPair,
  amountWei?: string,
  fromAddress?: string | null
): Promise<QuoteResult> {
  const amount = amountWei ?? defaultAmountWei(pair.fromToken);
  const resolvedFrom =
    fromAddress && isEvmAddress(fromAddress)
      ? fromAddress
      : (await getInventoryQuoteContext()).firstWalletAddress ?? ZERO_ADDRESS;

  try {
    const res = await postCoreQuoteSwap({
      provider: "squid",
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

/** Fetch quotes for multiple pairs; from_address from first wallet in inventory. */
export async function getQuotesForPairs(
  pairs: TokenPair[],
  amountWei?: string
): Promise<QuoteResult[]> {
  const ctx = await getInventoryQuoteContext();
  const fromAddress = ctx.firstWalletAddress;
  const results: QuoteResult[] = [];
  for (const pair of pairs) {
    results.push(await getQuoteForPair(pair, amountWei, fromAddress));
  }
  return results;
}

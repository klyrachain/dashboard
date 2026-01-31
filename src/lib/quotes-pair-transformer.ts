/**
 * Transformer: raw pair list (symbol + chain name) → resolved pairs with chain ID + token address.
 * Uses chains and tokens from BACKEND_URL so swap quote API receives chain id and token address.
 * @see md/quotes-integration.md
 */

import type { BackendChain, BackendToken } from "@/lib/backend-api";
import type { TokenPair } from "@/lib/data-quotes";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

/** Native ETH sentinel used by quote API (0x, Squid). */
export const NATIVE_ETH_ADDRESS = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";

function isEvmAddress(s: string): boolean {
  return EVM_ADDRESS_REGEX.test(String(s).trim());
}

/** Raw pair from transactions: symbol + chain name. */
export type RawPair = {
  from: string;
  to: string;
  fromChain: string;
  toChain: string;
  count: number;
};

/** Build chain name (uppercase) → chain ID from backend chains. */
export function buildChainNameToId(chains: BackendChain[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of chains) {
    const id = Number(c.chainId);
    if (!Number.isInteger(id)) continue;
    const key = (c.networkName ?? "").trim().toUpperCase();
    if (key) m.set(key, id);
  }
  return m;
}

/** Build (chainId:symbol) → token address from backend tokens. Key uses number chainId. */
export function buildTokenByChainAndSymbol(tokens: BackendToken[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const t of tokens) {
    const chainId = Number(t.chainId);
    if (!Number.isInteger(chainId)) continue;
    const symbol = (t.symbol ?? "").trim().toUpperCase();
    const addr = (t.address ?? "").trim();
    if (!symbol || !isEvmAddress(addr)) continue;
    m.set(`${chainId}:${symbol}`, addr);
  }
  return m;
}

/** Resolve chain name to chain ID; fallback 8453 (Base) if unknown. */
function resolveChainId(chainName: string, chainNameToId: Map<string, number>): number {
  const key = chainName.trim().toUpperCase();
  return chainNameToId.get(key) ?? 8453;
}

/** Resolve (chainId, symbol) to token address; native ETH always uses 0xeee...; empty if not found. */
function resolveTokenAddress(
  chainId: number,
  symbol: string,
  tokenByChainAndSymbol: Map<string, string>
): string {
  const sym = symbol.trim().toUpperCase();
  if (sym === "ETH") return NATIVE_ETH_ADDRESS;
  const key = `${chainId}:${sym}`;
  return tokenByChainAndSymbol.get(key) ?? "";
}

/**
 * Expand raw pairs to TokenPair[] with chain IDs and token addresses.
 * Only includes pairs where both tokens resolve to a valid address on the correct chain.
 */
export function expandPairs(
  rawPairs: RawPair[],
  chains: BackendChain[],
  tokens: BackendToken[]
): TokenPair[] {
  const chainNameToId = buildChainNameToId(chains);
  const tokenByChainAndSymbol = buildTokenByChainAndSymbol(tokens);
  const result: TokenPair[] = [];
  const seen = new Set<string>();

  for (const p of rawPairs) {
    const fromChainId = resolveChainId(p.fromChain, chainNameToId);
    const toChainId = resolveChainId(p.toChain, chainNameToId);
    const fromAddress = resolveTokenAddress(fromChainId, p.from, tokenByChainAndSymbol);
    const toAddress = resolveTokenAddress(toChainId, p.to, tokenByChainAndSymbol);

    if (!isEvmAddress(fromAddress) || !isEvmAddress(toAddress)) continue;

    const labelKey = `${p.from}/${p.to}`.toLowerCase();
    if (seen.has(labelKey)) continue;
    seen.add(labelKey);

    result.push({
      fromToken: p.from,
      toToken: p.to,
      fromChain: p.fromChain,
      toChain: p.toChain,
      fromChainId,
      toChainId,
      fromAddress,
      toAddress,
      label: `${p.from}/${p.to}`,
      count: p.count,
    });
  }

  return result;
}

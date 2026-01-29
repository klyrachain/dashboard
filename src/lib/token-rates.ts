/**
 * Token-to-USD rates for balance aggregation.
 * Mock rates; replace with real price feed (e.g. Core API or oracle) when available.
 */

const MOCK_USD_RATES: Record<string, number> = {
  USDC: 1,
  USDT: 1,
  DAI: 1,
  USD: 1,
  ETH: 2000,
  WETH: 2000,
  BTC: 40000,
  WBTC: 40000,
  MATIC: 0.8,
  BNB: 300,
  AVAX: 35,
  ARB: 1.2,
  OP: 2,
  BASE: 0,
};

/**
 * Returns USD price per 1 unit of the given token symbol.
 * Unknown symbols default to 0 (excluded from USD totals).
 */
export function getTokenUsdRate(symbol: string): number {
  if (!symbol || typeof symbol !== "string") return 0;
  const key = symbol.toUpperCase().trim();
  return MOCK_USD_RATES[key] ?? 0;
}

/**
 * Converts token amount to USD using getTokenUsdRate.
 */
export function toUsd(symbol: string, amount: number): number {
  return amount * getTokenUsdRate(symbol);
}

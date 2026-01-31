/**
 * Token amount formatting (Apple-style): stablecoins 2 decimals, ETH/18-decimal tokens more.
 * Use across quotes, balances, home, and any token number display.
 */

/** Stablecoin symbols that use 2 display decimals (and 6 wei decimals). */
const STABLECOIN_SYMBOLS = new Set([
  "USDC",
  "USDT",
  "DAI",
  "BUSD",
  "TUSD",
  "USDP",
  "FRAX",
  "GUSD",
]);

/** Decimals used on-chain for wei/smallest unit (6 for USDC/USDT, 18 for ETH). */
export function getTokenDecimalsForWei(symbol: string): number {
  const s = (symbol || "").trim().toUpperCase();
  if (STABLECOIN_SYMBOLS.has(s)) return 6;
  return 18;
}

/** Display decimals: 2 for stablecoins, 6 for ETH-style (so 0.000001 shows). */
export function getTokenDisplayDecimals(symbol: string): number {
  const s = (symbol || "").trim().toUpperCase();
  if (STABLECOIN_SYMBOLS.has(s)) return 2;
  return 6;
}

/** Format a human-readable token amount by symbol (2 decimals for USDC/USDT, more for ETH). */
export function formatTokenAmount(value: number, symbol: string): string {
  const decimals = getTokenDisplayDecimals(symbol);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: Math.min(2, decimals),
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Format wei/smallest-unit string to human-readable token amount by symbol. */
export function formatTokenAmountFromWei(wei: string, symbol: string): string {
  const decimals = getTokenDecimalsForWei(symbol);
  const n = BigInt(wei);
  const div = BigInt(10 ** decimals);
  const whole = n / div;
  const frac = n % div;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, decimals);
  const combined = `${whole}.${fracStr}`.replace(/\.?0+$/, "");
  const value = Number.parseFloat(combined);
  return formatTokenAmount(value, symbol);
}

/** Format a rate (to/from token per 1 from token) with appropriate decimals by toSymbol. */
export function formatTokenRate(rate: number, toSymbol: string): string {
  const decimals = getTokenDisplayDecimals(toSymbol);
  if (rate >= 1) return rate.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return rate.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

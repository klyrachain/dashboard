/**
 * Token and fiat rates by (chain, token).
 * Fetches from CoinGecko (crypto) and fiat APIs (e.g. GHS).
 * Supports quote currencies: USD, USDC, GHS.
 */

export type QuoteCurrency = "usd" | "usdc" | "ghs";

export const QUOTE_CURRENCIES: { value: QuoteCurrency; label: string }[] = [
  { value: "usdc", label: "USDC" },
  { value: "usd", label: "USD" },
  { value: "ghs", label: "GHS" },
];

/** Normalize chain to CoinGecko platform id or "fiat" for MOMO/BANK etc. */
const CHAIN_TO_PLATFORM: Record<string, string> = {
  ethereum: "ethereum",
  base: "base",
  polygon: "polygon-pos",
  "polygon-pos": "polygon-pos",
  arbitrum: "arbitrum-one",
  "arbitrum-one": "arbitrum-one",
  optimism: "optimism",
  bnb: "binance-smart-chain",
  "binance-smart-chain": "binance-smart-chain",
  avax: "avalanche",
  avalanche: "avalanche",
  momo: "fiat",
  bank: "fiat",
  // zora: "zora-network",
  // "zora-network": "zora-network",
};

/** (platform, token upper) -> CoinGecko contract address. Token price by chain. */
const TOKEN_CONTRACTS: Record<string, Record<string, string>> = {
  ethereum: {
    USDC: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    USDT: "0xdac17f958d2ee523a2206206994597c13d831ec7",
    DAI: "0x6b175474e89094c44da98b954eedeac495271d0f",
    WETH: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2",
  },
  base: {
    USDC: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    USDT: "0xfde4c96c8593536e31f229ea8f37b4ada2699bb2",
    DAI: "0x50c5725949a6f0c72e6c4a641f24049a917db0cb",
    ZORA: "0x1111111111166b7fe7bd91427724b487980afc69",
  },
  // "zora-network": {
  //   WETH: "0x4200000000000000000000000000000000000006",
  // },
  "polygon-pos": {
    USDC: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    USDT: "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
  },
  "arbitrum-one": {
    USDC: "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
    USDT: "0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9",
  },
  optimism: {
    USDC: "0x0b2c639c533813f4aa9d7837caf62653d097ff85",
    USDT: "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58",
  },
};

/** Native/symbol -> CoinGecko coin id for simple/price. */
const COIN_IDS: Record<string, string> = {
  ETH: "ethereum",
  WETH: "weth",
  BTC: "bitcoin",
  WBTC: "wrapped-bitcoin",
  MATIC: "polygon-ecosystem-token",
  BNB: "binancecoin",
  AVAX: "avalanche-2",
  ARB: "arbitrum",
  OP: "optimism",
  SOL: "solana",
  USD: "usd",
  // USDC: "usd-coin",
};

const COINGECKO_BASE = "https://api.coingecko.com/api/v3";
const FIAT_RATES_URL = "https://open.er-api.com/v6/latest/USD";

export type AssetKey = { chain: string; token: string };

function assetKey(chain: string, token: string): string {
  const c = (chain ?? "").trim().toLowerCase();
  const t = (token ?? "").trim().toUpperCase();
  return `${c}:${t}`;
}

function normalizeChain(chain: string): string {
  const c = (chain ?? "").trim().toLowerCase();
  return CHAIN_TO_PLATFORM[c] ?? c;
}

/** Detect fiat (e.g. GHS on MOMO/BANK). */
function isFiatAsset(chain: string, token: string): boolean {
  const c = (chain ?? "").trim().toLowerCase();
  const t = (token ?? "").trim().toUpperCase();
  if (["momo", "bank"].includes(c) && ["GHS", "USD", "EUR", "NGN"].includes(t))
    return true;
  return false;
}

/** Fetch native/main coin prices by ids. */
async function fetchCoinGeckoSimplePrice(
  ids: string[],
  vs: string[]
): Promise<Record<string, Record<string, number>>> {
  if (ids.length === 0) return {};
  const uniqueIds = [...new Set(ids)];
  const vsStr = [...new Set(vs)].filter((v) => v !== "usdc").join(",");
  if (!vsStr) return {};
  const url = `${COINGECKO_BASE}/simple/price?ids=${uniqueIds.join(",")}&vs_currencies=${vsStr}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return {};
  const data = (await res.json()) as Record<string, Record<string, number>>;
  const out: Record<string, Record<string, number>> = {};
  for (const [id, rates] of Object.entries(data)) {
    const r: Record<string, number> = { ...rates };
    if (vs.includes("usdc")) r.usdc = rates.usd ?? 0;
    out[id] = r;
  }
  return out;
}

/** Fetch token price by platform and contract. */
async function fetchCoinGeckoTokenPrice(
  platform: string,
  contracts: string[],
  vs: string[]
): Promise<Record<string, Record<string, number>>> {
  if (contracts.length === 0) return {};
  const vsStr = [...new Set(vs)].filter((v) => v !== "usdc").join(",");
  if (!vsStr) return {};
  const url = `${COINGECKO_BASE}/simple/token_price/${platform}?contract_addresses=${contracts.join(",")}&vs_currencies=${vsStr}`;
  const res = await fetch(url, { next: { revalidate: 60 } });
  if (!res.ok) return {};
  const data = (await res.json()) as Record<string, Record<string, number>>;
  const out: Record<string, Record<string, number>> = {};
  for (const [addr, rates] of Object.entries(data)) {
    const r: Record<string, number> = { ...rates };
    if (vs.includes("usdc")) r.usdc = rates.usd ?? 0;
    out[addr.toLowerCase()] = r;
  }
  return out;
}

/** Fetch USD -> GHS (and other fiats). */
async function fetchFiatRates(): Promise<Record<string, number>> {
  try {
    const res = await fetch(FIAT_RATES_URL, { next: { revalidate: 3600 } });
    if (!res.ok) return {};
    const data = (await res.json()) as { rates?: Record<string, number> };
    return data.rates ?? {};
  } catch {
    return {};
  }
}

export type RatesMap = Record<string, Record<QuoteCurrency, number>>;

/**
 * Fetch rates for assets in the requested quote currencies.
 * Keys are "chain:token" (lowercase chain, uppercase token).
 */
export async function fetchRates(
  assets: AssetKey[],
  vsCurrencies: QuoteCurrency[]
): Promise<RatesMap> {
  const vs = vsCurrencies.map((v) => v);
  const result: RatesMap = {};

  const fiatAssets: AssetKey[] = [];
  const nativeIdToKeys = new Map<string, string[]>();
  const byPlatform = new Map<string, { contract: string; key: string }[]>();

  for (const a of assets) {
    const key = assetKey(a.chain, a.token);
    const chainNorm = normalizeChain(a.chain);
    const tokenUpper = (a.token ?? "").trim().toUpperCase();

    if (isFiatAsset(a.chain, a.token)) {
      fiatAssets.push(a);
      continue;
    }

    if (chainNorm === "fiat") {
      fiatAssets.push(a);
      continue;
    }

    const contractMap = TOKEN_CONTRACTS[chainNorm];
    const contract = contractMap?.[tokenUpper];
    const coinId = COIN_IDS[tokenUpper];

    if (contract) {
      const list = byPlatform.get(chainNorm) ?? [];
      list.push({ contract, key });
      byPlatform.set(chainNorm, list);
    } else if (coinId) {
      const keys = nativeIdToKeys.get(coinId) ?? [];
      keys.push(key);
      nativeIdToKeys.set(coinId, keys);
    } else {
      result[key] = { usd: 0, usdc: 0, ghs: 0 };
    }
  }

  const usdToGhsPromise = vs.includes("ghs") ? fetchFiatRates() : Promise.resolve({} as Record<string, number>);
  const fiatRates = await usdToGhsPromise;
  const ghsPerUsd = fiatRates.GHS ?? 0;

  const idsForSimple = [...nativeIdToKeys.keys()];
  if (idsForSimple.length > 0) {
    const simple = await fetchCoinGeckoSimplePrice(idsForSimple, vs);
    for (const [id, rates] of Object.entries(simple)) {
      const keys = nativeIdToKeys.get(id);
      if (keys) {
        const ghs = rates.usd != null && ghsPerUsd > 0 ? rates.usd * ghsPerUsd : 0;
        for (const key of keys) {
          result[key] = {
            usd: rates.usd ?? 0,
            usdc: rates.usdc ?? rates.usd ?? 0,
            ghs: rates.ghs ?? ghs,
          };
        }
      }
    }
  }

  for (const [platform, list] of byPlatform) {
    const contracts = [...new Set(list.map((x) => x.contract))];
    const tokenPrices = await fetchCoinGeckoTokenPrice(platform, contracts, vs);
    for (const { contract, key } of list) {
      const rates = tokenPrices[contract.toLowerCase()];
      if (rates) {
        const usd = rates.usd ?? 0;
        const ghs = usd > 0 && ghsPerUsd > 0 ? usd * ghsPerUsd : 0;
        result[key] = {
          usd,
          usdc: rates.usdc ?? usd,
          ghs: rates.ghs ?? ghs,
        };
      } else {
        result[key] = { usd: 0, usdc: 0, ghs: 0 };
      }
    }
  }

  for (const a of fiatAssets) {
    const key = assetKey(a.chain, a.token);
    const tokenUpper = (a.token ?? "").trim().toUpperCase();
    if (tokenUpper === "GHS") {
      result[key] = {
        usd: ghsPerUsd > 0 ? 1 / ghsPerUsd : 0,
        usdc: ghsPerUsd > 0 ? 1 / ghsPerUsd : 0,
        ghs: 1,
      };
    } else if (tokenUpper === "USD" || tokenUpper === "USDC") {
      result[key] = { usd: 1, usdc: 1, ghs: ghsPerUsd };
    } else {
      result[key] = { usd: 0, usdc: 0, ghs: 0 };
    }
  }

  return result;
}

/**
 * Returns USD price per 1 unit (sync fallback).
 * For accurate (chain, token) rates use fetchRates or /api/rates.
 */
export function getTokenUsdRate(_symbol: string): number {
  return 0;
}

/**
 * Converts amount to a value in the given quote currency using the provided rate.
 */
export function toQuote(
  amount: number,
  rateInQuote: number,
  _quote: QuoteCurrency
): number {
  return amount * rateInQuote;
}

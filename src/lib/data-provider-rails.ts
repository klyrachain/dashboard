import { getSessionToken } from "@/lib/auth";
import { getCoreProviderMetadata } from "@/lib/core-api";

export type ProviderRailRow = {
  providerCode: string;
  providerName: string;
  supportedCountries: string[];
  supportedFiatCurrencies: string[];
  supportedCryptoAssets: string[];
  status: string;
};

function parseRail(raw: unknown): ProviderRailRow | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const providerCode = String(o.providerCode ?? "");
  const providerName = String(o.providerName ?? "");
  if (!providerCode || !providerName) return null;
  const countries = Array.isArray(o.supportedCountries)
    ? o.supportedCountries.map((c) => String(c))
    : [];
  const fiat = Array.isArray(o.supportedFiatCurrencies)
    ? o.supportedFiatCurrencies.map((c) => String(c))
    : [];
  const crypto = Array.isArray(o.supportedCryptoAssets)
    ? o.supportedCryptoAssets.map((c) => String(c))
    : [];
  const status = String(o.status ?? "—");
  return {
    providerCode,
    providerName,
    supportedCountries: countries,
    supportedFiatCurrencies: fiat,
    supportedCryptoAssets: crypto,
    status,
  };
}

/** Fetch GET /api/provider-metadata from Core (server). */
export async function getProviderRailsForVerification(): Promise<ProviderRailRow[]> {
  const token = await getSessionToken();
  const res = await getCoreProviderMetadata(undefined, token ?? undefined);
  if (!res.ok || !res.data || typeof res.data !== "object") return [];
  const env = res.data as { success?: boolean; data?: unknown };
  if (env.success !== true || !Array.isArray(env.data)) return [];
  const out: ProviderRailRow[] = [];
  for (const row of env.data) {
    const parsed = parseRail(row);
    if (parsed) out.push(parsed);
  }
  return out;
}

/**
 * Server data for Settings → Provider catalog (Fonbnk assets + Country flags from Core).
 */

import { getSessionToken } from "@/lib/auth";
import { getCoreCountries, getCoreSettingsQuotesFonbnkSupported } from "@/lib/core-api";

export type FonbnkAssetRow = {
  code: string;
  network: string | null;
  asset: string | null;
  chainId: string | null;
  source: string | null;
  isActive: boolean;
  updatedAt: string;
};

export type CountryRow = {
  id: string;
  code: string;
  name: string;
  currency: string;
  supportedFonbnk: boolean;
  supportedPaystack: boolean;
};

function parseFonbnkPayload(raw: unknown): FonbnkAssetRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((x) => x && typeof x === "object") as FonbnkAssetRow[];
}

function parseCountriesPayload(raw: unknown): CountryRow[] {
  if (!raw || typeof raw !== "object") return [];
  const countries = (raw as { countries?: unknown }).countries;
  if (!Array.isArray(countries)) return [];
  return countries.filter((c) => c && typeof c === "object") as CountryRow[];
}

export async function getProviderCatalogData(): Promise<{
  ok: boolean;
  fonbnkAssets: FonbnkAssetRow[];
  countries: CountryRow[];
  error?: string;
}> {
  const token = await getSessionToken();
  const [fonRes, coRes] = await Promise.all([
    getCoreSettingsQuotesFonbnkSupported({ limit: 500 }, token ?? undefined),
    getCoreCountries({ supported: "any" }, token ?? undefined),
  ]);

  const errors: string[] = [];
  let fonbnkAssets: FonbnkAssetRow[] = [];
  let countries: CountryRow[] = [];

  if (fonRes.ok && fonRes.data && typeof fonRes.data === "object") {
    const env = fonRes.data as { success: boolean; data?: unknown; error?: string };
    if (env.success === true && env.data !== undefined) {
      fonbnkAssets = parseFonbnkPayload(env.data);
    } else if (env.success === false) {
      errors.push(env.error ?? "Fonbnk assets request failed");
    } else {
      errors.push("Unexpected Fonbnk assets response.");
    }
  } else {
    errors.push("Could not load Fonbnk supported assets from Core.");
  }

  if (coRes.ok && coRes.data && typeof coRes.data === "object") {
    const env = coRes.data as { success: boolean; data?: unknown; error?: string };
    if (env.success === true && env.data !== undefined) {
      countries = parseCountriesPayload(env.data);
    } else if (env.success === false) {
      errors.push(env.error ?? "Countries request failed");
    } else {
      errors.push("Unexpected countries response.");
    }
  } else {
    errors.push("Could not load countries from Core.");
  }

  return {
    ok: errors.length === 0,
    fonbnkAssets,
    countries,
    error: errors.length ? errors.join(" ") : undefined,
  };
}

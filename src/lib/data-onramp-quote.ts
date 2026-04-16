/**
 * Onramp/offramp quote — POST api/quote/onramp (fiat↔crypto via Fonbnk).
 * Token can be symbol (e.g. USDC) or contract address; amount_in "fiat" or "crypto".
 */

import {
  postCoreQuoteOnramp,
  type CoreQuoteOnrampBody,
  type CoreQuoteOnrampData,
} from "@/lib/core-api";

export type OnrampQuoteParams = {
  country: string;
  chain_id: number;
  token: string;
  amount: number;
  amount_in: "fiat" | "crypto";
  purchase_method?: "buy" | "sell";
  from_address?: string;
  token_decimals?: number;
};

export type OnrampQuoteResult = {
  ok: boolean;
  data?: CoreQuoteOnrampData | null;
  error?: string;
};

/**
 * Fetch onramp/offramp quote from POST api/quote/onramp.
 * Body 1: token as address + from_address.
 * Body 2/3: token as symbol (e.g. USDC), optional purchase_method (buy/sell).
 */
export async function getOnrampQuote(
  params: OnrampQuoteParams
): Promise<OnrampQuoteResult> {
  const body: CoreQuoteOnrampBody = {
    country: params.country,
    chain_id: params.chain_id,
    token: params.token,
    amount: params.amount,
    amount_in: params.amount_in,
  };
  if (params.purchase_method != null) body.purchase_method = params.purchase_method;
  if (params.from_address != null) body.from_address = params.from_address;
  if (params.token_decimals != null) body.token_decimals = params.token_decimals;

  try {
    const res = await postCoreQuoteOnramp(body);
    const envelope = res.data;
    if (!res.ok || !envelope || typeof envelope !== "object") {
      const err =
        envelope && typeof envelope === "object" && "error" in envelope
          ? String((envelope as { error: string }).error)
          : "Onramp quote failed";
      return { ok: false, error: err };
    }
    const payload = envelope as { success?: boolean; data?: CoreQuoteOnrampData };
    const data = payload.data;
    return { ok: true, data: data ?? null };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Network error";
    return { ok: false, error: message };
  }
}

export type { CoreQuoteOnrampData };

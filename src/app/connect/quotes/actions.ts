"use server";

import { getQuotesForPairs } from "@/lib/data-quotes";
import type { TokenPair, QuoteResult, SwapQuoteProvider } from "@/lib/data-quotes";
import { getOnrampQuote } from "@/lib/data-onramp-quote";
import type { OnrampQuoteParams, OnrampQuoteResult } from "@/lib/data-onramp-quote";

export async function getQuotesAction(
  pairs: TokenPair[],
  provider: SwapQuoteProvider = "squid"
): Promise<QuoteResult[]> {
  return getQuotesForPairs(pairs, undefined, provider);
}

export async function getOnrampQuoteAction(
  params: OnrampQuoteParams
): Promise<OnrampQuoteResult> {
  return getOnrampQuote(params);
}

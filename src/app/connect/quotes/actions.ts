"use server";

import { getQuotesForPairs } from "@/lib/data-quotes";
import type { TokenPair, QuoteResult } from "@/lib/data-quotes";
import { getOnrampQuote } from "@/lib/data-onramp-quote";
import type { OnrampQuoteParams, OnrampQuoteResult } from "@/lib/data-onramp-quote";

export async function getQuotesAction(
  pairs: TokenPair[],
  amountWei?: string
): Promise<QuoteResult[]> {
  return getQuotesForPairs(pairs, amountWei);
}

export async function getOnrampQuoteAction(
  params: OnrampQuoteParams
): Promise<OnrampQuoteResult> {
  return getOnrampQuote(params);
}

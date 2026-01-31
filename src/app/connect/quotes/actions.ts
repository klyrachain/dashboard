"use server";

import { getQuotesForPairs } from "@/lib/data-quotes";
import type { TokenPair, QuoteResult } from "@/lib/data-quotes";

export async function getQuotesAction(
  pairs: TokenPair[],
  amountWei?: string
): Promise<QuoteResult[]> {
  return getQuotesForPairs(pairs, amountWei);
}

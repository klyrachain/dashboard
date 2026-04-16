import { getChainsTokensAndPairs } from "@/lib/data-quotes";
import { QuotesPageClient } from "@/components/connect/quotes-page-client";
import { OnrampQuoteSection } from "@/components/connect/onramp-quote-section";

export default async function ConnectQuotesPage() {
  const { chains, tokens, pairs } = await getChainsTokensAndPairs(8);

  return (
    <div className="space-y-8 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Quotes
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Fiat↔crypto (onramp) and swap quotes for the most traded token pairs.
          Drag swap cards to reorder.
        </p>
      </div>

      <OnrampQuoteSection chains={chains} tokens={tokens} />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Swap quotes (most traded pairs)
        </h2>
        <QuotesPageClient pairs={pairs} />
      </section>
    </div>
  );
}

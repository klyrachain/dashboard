import { getMostTradedPairs } from "@/lib/data-quotes";
import { QuotesPageClient } from "@/components/connect/quotes-page-client";

export default async function ConnectQuotesPage() {
  const pairs = await getMostTradedPairs(8);

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Quotes
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Live swap quotes for the most traded token pairs from your transactions.
          Drag cards to reorder.
        </p>
      </div>
      <QuotesPageClient pairs={pairs} />
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryAssetContainer } from "@/components/inventory/inventory-asset-container";
import { InventoryLotsSummary } from "@/components/inventory/inventory-lots-section";
import { ChainsTokensSection } from "@/components/inventory/chains-tokens-section";
import type { LotsListResult } from "@/lib/data-lots-chains";
import type { ChainRow, TokenRow } from "@/lib/data-lots-chains";

type InventoryOverviewProps = {
  lotsResult: LotsListResult;
  chains: ChainRow[];
  tokens: TokenRow[];
};

export function InventoryOverview({ lotsResult, chains, tokens }: InventoryOverviewProps) {
  return (
    <Card className="bg-white">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold tracking-tight">Inventory overview</CardTitle>
        <p className="text-xs text-muted-foreground">
          Assets, lots summary, chains & tokens at a glance.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Section: Assets (compact) */}
        <section aria-labelledby="overview-assets-heading">
          <h3 id="overview-assets-heading" className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Assets
          </h3>
          <InventoryAssetContainer compact />
        </section>

        {/* Section: Lots (summary only) */}
        <section aria-labelledby="overview-lots-heading">
          <h3 id="overview-lots-heading" className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Lots
          </h3>
          <InventoryLotsSummary result={lotsResult} />
        </section>

        {/* Section: Chains & Tokens (compact) */}
        <section aria-labelledby="overview-chains-tokens-heading">
          <h3 id="overview-chains-tokens-heading" className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Chains & tokens
          </h3>
          <ChainsTokensSection chains={chains} tokens={tokens} compact />
        </section>
      </CardContent>
    </Card>
  );
}

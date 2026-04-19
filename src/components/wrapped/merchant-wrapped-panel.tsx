"use client";

import { useMemo } from "react";
import { useGetMerchantWrappedSummaryQuery } from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type WrappedToken = { symbol: string; amount: number };
type WrappedChain = { chain: string; count: number };

export function MerchantWrappedPanel() {
  const { skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();
  const { data, isLoading } = useGetMerchantWrappedSummaryQuery(
    { period: "year", merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const topToken = useMemo(() => {
    const first = (data?.topTokens as WrappedToken[] | undefined)?.[0];
    return first ? `${first.symbol} (${first.amount.toFixed(2)})` : "—";
  }, [data?.topTokens]);
  const topChain = useMemo(() => {
    const first = (data?.topChains as WrappedChain[] | undefined)?.[0];
    return first ? `${first.chain} (${first.count})` : "—";
  }, [data?.topChains]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading wrapped summary…</p>;
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold tabular-nums">
          {data?.totals?.transactions ?? 0}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Top token</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{topToken}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Top chain</CardTitle>
        </CardHeader>
        <CardContent className="text-xl font-semibold">{topChain}</CardContent>
      </Card>
    </section>
  );
}

"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ChainCardWithChart } from "@/components/balances/chain-card-with-chart";
import { RecentActivityTable } from "@/components/balances/recent-activity-table";
import { useGetInventoryQuery } from "@/store/inventory-api";
import {
  buildBalancesFromAssets,
  formatTokenAmount,
  formatCurrency,
  type AggregatedAsset,
  type PendingState,
  type ClaimableState,
  type BalanceActivity,
} from "@/lib/data-balances";
import type { RatesMap } from "@/lib/token-rates";
import { BalancesSkeleton } from "@/components/balances/balances-skeleton";
import { Badge } from "@/components/ui/badge";

function EmptyCardState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
        <span className="text-lg text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">{title}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function AggregationRow({ asset }: { asset: AggregatedAsset }) {
  const nonZero = asset.breakdown.filter((b) => b.sharePercent > 0);
  return (
    <div className="flex flex-col gap-1 mb-4 py-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-slate-500">
          Total {asset.symbol}
        </span>
        <span className="font-mono text-2xl font-semibold text-slate-900">
          {formatTokenAmount(asset.totalAmount, asset.symbol)}
        </span>
      </div>
      {nonZero.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {nonZero.map((b) => (
            <Badge
              key={b.chainId}
              variant="secondary"
              className="text-xs font-normal text-slate-600"
            >
              {b.sharePercent}% on{" "}
              {b.chainId.charAt(0).toUpperCase() + b.chainId.slice(1)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

type BalancesContentClientProps = {
  pending: PendingState;
  claimable: ClaimableState;
  recentActivity: BalanceActivity[];
  pageTitle?: string;
  pageDescription?: string;
};

export function BalancesContentClient({
  pending,
  claimable,
  recentActivity,
  pageTitle = "Balances",
  pageDescription = "Real-time overview of assets across all chains and liquidity pools.",
}: BalancesContentClientProps) {
  const { data: assets = [], isLoading } = useGetInventoryQuery();
  const [ratesMap, setRatesMap] = useState<RatesMap | null>(null);

  const fetchRates = useCallback(async () => {
    if (assets.length === 0) {
      setRatesMap(null);
      return;
    }
    try {
      const assetsParam = encodeURIComponent(
        JSON.stringify(assets.map((a) => ({ chain: a.chain, token: a.token })))
      );
      const res = await fetch(
        `/api/rates?assets=${assetsParam}&vs=usd`
      );
      const json = (await res.json()) as { success?: boolean; data?: RatesMap };
      if (json.success && json.data) setRatesMap(json.data);
      else setRatesMap(null);
    } catch {
      setRatesMap(null);
    }
  }, [assets]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const { chains, aggregated } = useMemo(
    () => buildBalancesFromAssets(assets, ratesMap),
    [assets, ratesMap]
  );

  const hasChains = chains.length > 0;
  const hasAggregated = aggregated.length > 0;
  const hasPending =
    pending.floatingAmountUsd > 0 || pending.activeOrdersCount > 0;
  const hasClaimable =
    claimable.totalUsd > 0 || claimable.byCurrency.length > 0;

  if (isLoading) {
    return <BalancesSkeleton />;
  }

  return (
    <div className="space-y-8 font-primary text-body">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-display font-semibold tracking-tight">
            {pageTitle}
          </h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            {pageDescription}
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2">
          <RefreshCcw className="size-4" aria-hidden />
          Refresh Liquidity
        </Button>
      </header>

      {hasChains && (
        <section>
          <h2 className="mb-4 text-sm font-medium text-slate-500">
            Liquidity by Chain
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {chains.map((chain) => (
              <ChainCardWithChart key={chain.chainId} chain={chain} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          Asset Aggregation
        </h2>
        <Card className="bg-white">
          <CardContent className="px-6 py-4">
            {hasAggregated ? (
              aggregated.map((asset) => (
                <AggregationRow key={asset.symbol} asset={asset} />
              ))
            ) : (
              <EmptyCardState
                title="No aggregated assets"
                description="Asset totals will appear here once data is available."
              />
            )}
          </CardContent>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          In-Flight & Claimable
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-slate-500">
                Pending Transactions
              </p>
              {hasPending && (
                <>
                  <p className="font-mono text-2xl font-semibold text-slate-900">
                    {formatCurrency(pending.floatingAmountUsd)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Currently active in {pending.activeOrdersCount} orders.
                  </p>
                </>
              )}
            </CardHeader>
            {hasPending ? (
              <CardContent className="space-y-3">
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-slate-400 transition-all"
                    style={{
                      width: `${Math.min(pending.capacityUsedPercent, 100)}%`,
                    }}
                    aria-hidden
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Capacity usage: {pending.capacityUsedPercent}%
                </p>
              </CardContent>
            ) : (
              <CardContent>
                <EmptyCardState
                  title="No pending transactions"
                  description="Active orders and floating amounts will show here."
                />
              </CardContent>
            )}
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <p className="text-sm font-medium text-slate-500">
                Claimable by user
              </p>
              {hasClaimable && (
                <p className="font-mono text-2xl font-semibold text-slate-900">
                  {formatCurrency(claimable.totalUsd)}
                </p>
              )}
            </CardHeader>
            {hasClaimable ? (
              <CardContent className="space-y-3">
                <ul className="space-y-1.5 text-sm text-slate-600">
                  {claimable.byCurrency.map((c) => (
                    <li
                      key={c.symbol}
                      className="flex justify-between font-mono"
                    >
                      <span>{c.symbol}</span>
                      <span>{formatTokenAmount(c.amount, c.symbol)}</span>
                    </li>
                  ))}
                </ul>
                <Button variant="outline" size="sm" className="w-full">
                  Sweep Funds
                </Button>
              </CardContent>
            ) : (
              <CardContent>
                <EmptyCardState
                  title="No claimable revenue"
                  description="Unclaimed fees will appear here when available."
                />
              </CardContent>
            )}
          </Card>
        </div>
      </section>

      <RecentActivityTable activities={recentActivity} />
    </div>
  );
}

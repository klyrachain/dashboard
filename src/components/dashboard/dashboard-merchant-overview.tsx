"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { format, parseISO } from "date-fns";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useGetMerchantSummaryQuery,
  useGetMerchantSettlementsQuery,
  useGetMerchantTransactionsQuery,
} from "@/store/merchant-api";
import type { MerchantSummary } from "@/types/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";

const PERIOD_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
] as const;

const SERIES_OPTIONS = [
  { value: "7", label: "7-day chart" },
  { value: "14", label: "14-day chart" },
  { value: "30", label: "30-day chart" },
] as const;

function formatUsd(value: string | undefined | null): string {
  if (value == null || value === "") return "None";
  const n = Number.parseFloat(String(value).replace(/,/g, ""));
  if (Number.isNaN(n)) return "None";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function formatNumber(n: number | undefined | null): string {
  if (n == null || Number.isNaN(n)) return "None";
  return n.toLocaleString("en-US");
}

function buildSeriesChartData(summary: MerchantSummary) {
  return summary.series.map((row) => {
    const vol = Number.parseFloat(String(row.completedVolumeUsd).replace(/,/g, ""));
    return {
      date: row.date,
      label: (() => {
        try {
          return format(parseISO(row.date), "MMM d");
        } catch {
          return row.date;
        }
      })(),
      transactionCount: row.transactionCount,
      volumeUsd: Number.isFinite(vol) ? vol : 0,
    };
  });
}

function buildStatusChartData(byStatus: Record<string, number> | undefined) {
  if (!byStatus) return [];
  return Object.entries(byStatus).map(([name, value]) => ({
    name,
    value,
  }));
}

function isKybVerified(value: string | undefined): boolean {
  const normalized = (value ?? "").trim().toLowerCase();
  return normalized === "approved" || normalized === "verified";
}

const noopSubscribe = () => () => {};

function useClientReady(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Matches loading UI; used for SSR + first client paint to avoid hydration mismatch when Redux hydrates after mount. */
function MerchantOverviewLoadingSkeleton() {
  return (
    <div
      className="space-y-6"
      aria-busy="true"
      aria-label="Loading business overview"
    >
      <div className="flex flex-wrap gap-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

function MerchantOverviewFallback() {
  const { skipMerchantApi } = useMerchantTenantScope();
  const txQ = useGetMerchantTransactionsQuery(
    { page: 1, limit: 1 },
    { skip: skipMerchantApi }
  );
  const stQ = useGetMerchantSettlementsQuery(
    { page: 1, limit: 1 },
    { skip: skipMerchantApi }
  );

  if (txQ.isLoading || stQ.isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const txTotal = txQ.data?.meta.total ?? 0;
  const stTotal = stQ.data?.meta.total ?? 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{txTotal}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/transactions">View transactions</Link>
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums">{stTotal}</p>
          <Button variant="outline" size="sm" className="mt-4" asChild>
            <Link href="/settlements">View payouts</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export function DashboardMerchantOverview() {
  const mounted = useClientReady();

  const { effectiveBusinessId, skipMerchantApi } = useMerchantTenantScope();
  const [periodDays, setPeriodDays] = useState(30);
  const [seriesDays, setSeriesDays] = useState(14);

  const summaryArgs = useMemo(
    () => ({ days: periodDays, seriesDays }),
    [periodDays, seriesDays]
  );

  const summaryQ = useGetMerchantSummaryQuery(summaryArgs, {
    skip: skipMerchantApi,
  });

  const showFallback =
    Boolean(effectiveBusinessId) &&
    !summaryQ.isLoading &&
    !summaryQ.isFetching &&
    (summaryQ.isError || summaryQ.data == null);

  const data = summaryQ.data;

  const seriesChart = useMemo(
    () => (data ? buildSeriesChartData(data) : []),
    [data]
  );

  const statusInPeriod = useMemo(
    () => buildStatusChartData(data?.transactions?.byStatusInPeriod),
    [data]
  );

  if (!mounted) {
    return <MerchantOverviewLoadingSkeleton />;
  }

  if (!effectiveBusinessId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Business overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground" role="status">
            Choose a business in the header to see your numbers.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (summaryQ.isLoading || summaryQ.isFetching) {
    return <MerchantOverviewLoadingSkeleton />;
  }

  if (showFallback) {
    return (
      <div className="space-y-6">
        <div
          className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive"
          role="alert"
        >
          <p className="font-semibold">Summary unavailable</p>
          <p className="mt-1 text-destructive/90">Showing basic counts.</p>
        </div>
        <MerchantOverviewFallback />
      </div>
    );
  }

  if (!data) {
    return <MerchantOverviewFallback />;
  }

  const t = data.transactions;
  const fees = data.fees;
  const settlements = data.settlements;

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p
            id="merchant-overview-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            Reporting
          </p>
          <p className="text-sm text-muted-foreground">
            {data.business.name}
            {data.business.kybStatus ? (
              <span className="ml-2 text-xs rounded-md px-2 py-0.5">
                KYB: {data.business.kybStatus}
              </span>
            ) : null}
          </p>
          {!isKybVerified(data.business.kybStatus) ? (
            <Button variant="outline" size="sm" className="mt-2" asChild>
              <Link href="/settings/verification">KYB</Link>
            </Button>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Completed volume {formatUsd(t.volumeUsdInPeriod)} this period,{" "}
            {data.periodFrom.slice(0, 10)} to {data.periodTo.slice(0, 10)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select
            value={String(periodDays)}
            onValueChange={(v) => setPeriodDays(Number.parseInt(v, 10))}
          >
            <SelectTrigger className="w-[160px]" aria-label="Reporting period">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PERIOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={String(seriesDays)}
            onValueChange={(v) => setSeriesDays(Number.parseInt(v, 10))}
          >
            <SelectTrigger className="w-[140px]" aria-label="Chart window">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SERIES_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Volume (period, USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatUsd(t.volumeUsdInPeriod)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(t.completedCountInPeriod)} completed in period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatNumber(t.inPeriod)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              All time {formatNumber(t.totalAllTime)}, 24h{" "}
              {formatNumber(t.last24hCount)}, 7d {formatNumber(t.last7dCount)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Platform fees (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatUsd(t.platformFeesUsdInPeriod)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Merchant fees (USD)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">
              {formatUsd(t.merchantFeesUsdInPeriod)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Fees (converted): {formatUsd(fees.totalConvertedUsd)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Activity and volume
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              Daily sales count and completed volume in USD
            </p>
          </CardHeader>
          <CardContent>
            {seriesChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                No series data for this range.
              </p>
            ) : (
              <div className="h-[min(360px,50vh)] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={seriesChart}
                    margin={{ top: 8, right: 12, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      yAxisId="left"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                      tickFormatter={(v) =>
                        v >= 1e6
                          ? `$${(v / 1e6).toFixed(1)}M`
                          : v >= 1e3
                            ? `$${(v / 1e3).toFixed(1)}k`
                            : `$${v}`
                      }
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="transactionCount"
                      name="Tx count"
                      fill="var(--chart-1)"
                      radius={[4, 4, 0, 0]}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="volumeUsd"
                      name="Volume USD"
                      stroke="var(--chart-2)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              By status
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              How many payments in each state for this window
            </p>
          </CardHeader>
          <CardContent>
            {statusInPeriod.length === 0 ? (
              <p className="text-sm text-muted-foreground">No breakdown.</p>
            ) : (
              <div className="h-[min(360px,50vh)] w-full min-h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={statusInPeriod}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={88}
                      tick={{ fontSize: 11 }}
                      className="text-muted-foreground"
                    />
                    <Tooltip />
                    <Bar
                      dataKey="value"
                      name="Count"
                      fill="var(--chart-3)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {(settlements.countByStatus &&
        Object.keys(settlements.countByStatus).length > 0) ||
      (settlements.amountSumByCurrencyAndStatus &&
        settlements.amountSumByCurrencyAndStatus.length > 0) ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Payout snapshot
            </CardTitle>
            <p className="text-sm font-normal text-muted-foreground">
              What went out to your accounts in this period
            </p>
          </CardHeader>
          <CardContent className="grid gap-6 md:grid-cols-2">
            {settlements.countByStatus &&
            Object.keys(settlements.countByStatus).length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">By status</p>
                <ul className="space-y-1 text-sm">
                  {Object.entries(settlements.countByStatus).map(
                    ([k, v]) => (
                      <li
                        key={k}
                        className="flex justify-between gap-4 py-1"
                      >
                        <span className="text-muted-foreground">{k}</span>
                        <span className="tabular-nums font-medium">{v}</span>
                      </li>
                    )
                  )}
                </ul>
              </div>
            ) : null}
            {settlements.amountSumByCurrencyAndStatus &&
            settlements.amountSumByCurrencyAndStatus.length > 0 ? (
              <div>
                <p className="text-sm font-medium mb-2">Amounts by currency and status</p>
                <ul className="space-y-1 text-sm">
                  {settlements.amountSumByCurrencyAndStatus.map((row, i) => (
                    <li
                      key={`${row.currency}-${row.status}-${i}`}
                      className="flex justify-between gap-4 py-1"
                    >
                      <span className="text-muted-foreground">
                        {row.currency}, {row.status}
                      </span>
                      <span className="tabular-nums font-mono text-xs">
                        {row.sum}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {fees.byCurrency && Object.keys(fees.byCurrency).length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fees by currency
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-wrap gap-3 text-sm">
              {Object.entries(fees.byCurrency).map(([cur, amt]) => (
                <li
                  key={cur}
                  className="rounded-md px-3 py-2 bg-muted/30"
                >
                  <span className="font-mono text-xs text-muted-foreground">
                    {cur}
                  </span>{" "}
                  <span className="tabular-nums font-medium">{amt}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href="/transactions">View all transactions</Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href="/settlements">View payouts</Link>
        </Button>
      </div>
    </div>
  );
}

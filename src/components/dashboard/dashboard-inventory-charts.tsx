"use client";

import * as React from "react";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  buildInventoryChartData,
  type ChartFilterView,
  type InventoryChartSeries,
} from "@/lib/data-dashboard";
import type {
  InventoryAssetRow,
  InventoryHistoryPoint,
} from "@/lib/data-inventory";
import type { RatesMap } from "@/lib/token-rates";
import { useGetInventoryQuery } from "@/store/inventory-api";

type ChartMode = "current" | "over-time";

const VIEW_OPTIONS: { value: ChartFilterView; label: string }[] = [
  { value: "all-tokens", label: "All tokens" },
  { value: "by-chain", label: "By chain" },
  { value: "by-token-per-chain", label: "Token on each chain" },
  { value: "all-chains", label: "All chains" },
];

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function formatLastUpdated(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

function ChartLegend({
  data,
  colors,
}: {
  data: InventoryChartSeries[];
  colors: string[];
}) {
  if (data.length === 0) return null;
  return (
    <div
      className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-3"
      role="list"
      aria-label="Chart series"
    >
      {data.map((item, i) => (
        <div
          key={item.name}
          className="flex items-center gap-1.5 text-xs text-slate-600"
          role="listitem"
        >
          <span
            className="size-3 shrink-0 rounded-sm"
            style={{ backgroundColor: colors[i % colors.length] }}
            aria-hidden
          />
          <span className="capitalize">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

type DashboardInventoryChartsProps = {
  /** Optional initial data (e.g. from server); when not provided or empty, uses RTK Query for live updates. */
  initialAssets?: InventoryAssetRow[];
  historyPoints?: InventoryHistoryPoint[];
  /** When provided, used to convert balances to USD for the chart. */
  ratesMap?: RatesMap | null;
};

export function DashboardInventoryCharts({
  initialAssets: initialAssetsProp,
  historyPoints = [],
  ratesMap = null,
}: DashboardInventoryChartsProps) {
  const { data: queryAssets = [], isFetching } = useGetInventoryQuery();
  const initialAssets = React.useMemo(
    () =>
      queryAssets.length > 0 ? queryAssets : (initialAssetsProp ?? []),
    [queryAssets, initialAssetsProp]
  );

  const [chartMode, setChartMode] = React.useState<ChartMode>("current");
  const [view, setView] = React.useState<ChartFilterView>("all-tokens");

  const chartData = React.useMemo(() => {
    const rows = initialAssets.map((a) => ({
      chain: a.chain,
      token: a.token,
      balance: a.balance,
    }));
    return buildInventoryChartData(rows, view, true, ratesMap);
  }, [initialAssets, view, ratesMap]);

  const lastUpdated = React.useMemo(() => {
    if (initialAssets.length === 0) return null;
    const dates = initialAssets.map((a) => new Date(a.updatedAt).getTime());
    const latest = new Date(Math.max(...dates));
    return formatLastUpdated(latest);
  }, [initialAssets]);

  const hasHistory = historyPoints.length > 0;

  if (initialAssets.length === 0 && !hasHistory) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Inventory overview (Core)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
              <span className="text-2xl text-slate-400" aria-hidden>
                —
              </span>
            </div>
            <p className="text-sm font-medium text-slate-600">No data</p>
            <p className="text-xs text-slate-500">
              No inventory data from Core. Charts will appear when data is
              available.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Inventory overview (Core)</CardTitle>
          {lastUpdated && chartMode === "current" && (
            <p className="text-xs text-slate-500">
              From inventory · Last updated {lastUpdated}
              {isFetching && (
                <span className="ml-1.5 text-slate-400">· Updating…</span>
              )}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {hasHistory && (
            <Select
              value={chartMode}
              onValueChange={(v) => setChartMode(v as ChartMode)}
              aria-label="Chart type"
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current balances</SelectItem>
                <SelectItem value="over-time">Balance over time</SelectItem>
              </SelectContent>
            </Select>
          )}
          {chartMode === "current" && initialAssets.length > 0 && (
            <Select
              value={view}
              onValueChange={(v) => setView(v as ChartFilterView)}
              aria-label="View by"
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="View" />
              </SelectTrigger>
              <SelectContent>
                {VIEW_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[320px] w-full">
          {chartMode === "over-time" && hasHistory ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={historyPoints}
                margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
              >
                <defs>
                  <linearGradient
                    id="inventoryHistoryGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0.3}
                    />
                    <stop
                      offset="100%"
                      stopColor="var(--chart-1)"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  className="text-xs"
                  tick={{ fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  className="text-xs"
                  tick={{ fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => v.toLocaleString()}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value: number) => [
                    value.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    }),
                    "Balance",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Area
                  type="monotone"
                  dataKey="balance"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  fill="url(#inventoryHistoryGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : initialAssets.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                  layout={chartData.length > 8 ? "vertical" : "horizontal"}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-slate-200"
                  />
                  {chartData.length > 8 ? (
                    <>
                      <XAxis
                        type="number"
                        className="text-xs"
                        tick={{ fill: "var(--muted-foreground)" }}
                        tickFormatter={(v) =>
                          v.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                        }
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={140}
                        className="text-xs"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                      />
                    </>
                  ) : (
                    <>
                      <XAxis
                        dataKey="name"
                        className="text-xs"
                        tick={{ fill: "var(--muted-foreground)" }}
                        angle={
                          chartData.some((d) => d.name.length > 12) ? -45 : 0
                        }
                        textAnchor={
                          chartData.some((d) => d.name.length > 12)
                            ? "end"
                            : "middle"
                        }
                      />
                      <YAxis
                        className="text-xs"
                        tick={{ fill: "var(--muted-foreground)" }}
                        tickFormatter={(v) =>
                          v.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })
                        }
                      />
                    </>
                  )}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--background)",
                      borderRadius: "var(--radius)",
                    }}
                    formatter={(value: number) => [
                      value.toLocaleString("en-US", {
                        style: "currency",
                        currency: "USD",
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      }),
                      "USD",
                    ]}
                    labelFormatter={(label) => ` ${label}`}
                  />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
                    {chartData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <ChartLegend data={chartData} colors={CHART_COLORS} />
            </>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

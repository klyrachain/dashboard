"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { formatAmount, formatCurrency, type ChainBalance } from "@/lib/data-balances";

function ChainIcon({ chainId }: { chainId: string }) {
  const labels: Record<string, string> = {
    ethereum: "ETH",
    base: "BASE",
    arbitrum: "ARB",
    bnb: "BNB",
  };
  return (
    <span
      className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-xs font-medium text-slate-600"
      aria-hidden
    >
      {labels[chainId] ?? chainId.slice(0, 2).toUpperCase()}
    </span>
  );
}

function EmptyChainState() {
  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-center">
      <p className="text-sm font-medium text-slate-500">No data</p>
      <p className="text-xs text-slate-400">No token balances on this chain.</p>
    </div>
  );
}

export function ChainCardWithChart({ chain }: { chain: ChainBalance }) {
  const hasData = chain.tokens.length > 0;
  const chartData = chain.tokens.map((t) => ({
    symbol: t.symbol,
    amount: t.amount,
  }));

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-3">
          <ChainIcon chainId={chain.chainId} />
          <span className="text-sm font-medium text-slate-900">
            {chain.chainName}
          </span>
        </div>
        <span
          className={`size-2 shrink-0 rounded-full ${chain.healthy ? "bg-green-500" : "bg-red-500"
            }`}
          title={chain.healthy ? "Operational" : "Downtime"}
          aria-hidden
        />
      </CardHeader>
      <CardContent className="space-y-3 pb-4">
        <div className="h-[140px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-100"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickFormatter={(v) => formatAmount(v)}
                />
                <YAxis
                  type="category"
                  dataKey="symbol"
                  width={36}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "var(--background)",
                    borderRadius: "var(--radius)",
                  }}
                  formatter={(value: number) => [formatAmount(value), "Amount"]}
                  labelFormatter={(label) => `${label}`}
                />
                <Bar
                  dataKey="amount"
                  fill="var(--chart-1)"
                  radius={[0, 4, 4, 0]}
                  maxBarSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyChainState />
          )}
        </div>
        {hasData && (
          <div className="space-y-2">
            {chain.tokens.map((t) => (
              <div
                key={t.symbol}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-slate-500">{t.symbol}</span>
                <span className="font-mono font-medium text-slate-900">
                  {formatAmount(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between mb-4 pt-4 text-sm text-slate-500">
        <span>Total Value</span>
        <span className="font-mono font-medium text-slate-700">
          {hasData ? formatCurrency(chain.totalUsd) : "—"}
        </span>
      </CardFooter>
    </Card>
  );
}

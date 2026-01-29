"use client";

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TransactionRow } from "@/lib/data-transactions";
import { startOfDay, subDays } from "date-fns";

const TYPE_ORDER = ["BUY", "SELL", "REQUEST", "CLAIM", "TRANSFER"] as const;
const TYPE_COLORS: Record<string, string> = {
  BUY: "var(--chart-1)",
  SELL: "var(--chart-2)",
  REQUEST: "var(--chart-3)",
  CLAIM: "var(--chart-4)",
  TRANSFER: "var(--chart-5)",
};

/** Filter by: today only, or last N days. */
export type TypeChartRangeKey = "today" | "7" | "14" | "30";

const TYPE_CHART_RANGE_OPTIONS: { value: TypeChartRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
];

export type TransactionTypeChartDataPoint = {
  type: string;
  count: number;
  fill?: string;
};

function filterByRange(
  transactions: TransactionRow[],
  range: TypeChartRangeKey
): TransactionRow[] {
  const now = Date.now();
  const cutoff =
    range === "today"
      ? startOfDay(new Date()).getTime()
      : subDays(new Date(), Number(range)).getTime();

  return transactions.filter((t) => {
    const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
    return created.getTime() >= cutoff;
  });
}

function buildChartData(transactions: TransactionRow[]): TransactionTypeChartDataPoint[] {
  const counts = new Map<string, number>();
  for (const t of transactions) {
    const type = t.type?.toUpperCase() || "OTHER";
    counts.set(type, (counts.get(type) ?? 0) + 1);
  }
  return TYPE_ORDER.map((type) => ({
    type,
    count: counts.get(type) ?? 0,
    fill: TYPE_COLORS[type] ?? "var(--muted-foreground)",
  }));
}

/** Normalize so chart always gets an array (handles serialization / undefined from server→client). */
function normalizeTransactions(
  transactions: TransactionRow[] | undefined | null
): TransactionRow[] {
  if (Array.isArray(transactions)) return transactions;
  return [];
}

function getRangeSubtitle(range: TypeChartRangeKey): string {
  if (range === "today") return "Count by type (today)";
  return `Count by type (last ${range} days)`;
}

export function TransactionsTypeChart({
  transactions: rawTransactions,
}: {
  transactions?: TransactionRow[] | null;
}) {
  const [range, setRange] = useState<TypeChartRangeKey>("14");
  const transactions = useMemo(
    () => normalizeTransactions(rawTransactions),
    [rawTransactions]
  );
  const filtered = useMemo(
    () => filterByRange(transactions, range),
    [transactions, range]
  );
  const chartData = useMemo(() => buildChartData(filtered), [filtered]);
  const hasAnyCount = chartData.some((d) => d.count > 0);

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Transactions by type
          </p>
          <p className="text-xs text-slate-400">{getRangeSubtitle(range)}</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as TypeChartRangeKey)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_CHART_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                className="stroke-slate-100"
                vertical={false}
              />
              <XAxis
                dataKey="type"
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                width={28}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  fontSize: "12px",
                }}
                labelStyle={{ color: "var(--foreground)" }}
                formatter={(value: number) => [value, "Count"]}
                labelFormatter={(label) => `Type: ${label}`}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} name="Count">
                {chartData.map((entry) => (
                  <Cell key={entry.type} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        {!hasAnyCount && (
          <p className="mt-2 text-center text-xs text-slate-500">
            No transactions yet. Chart shows counts per type when data is available.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

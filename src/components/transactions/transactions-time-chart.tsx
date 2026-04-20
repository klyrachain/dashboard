"use client";

import { useMemo, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
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
import { format, subDays, startOfDay, startOfWeek, subWeeks, setHours } from "date-fns";

const TYPE_ORDER = ["BUY", "SELL", "REQUEST", "CLAIM", "TRANSFER"] as const;
const TYPE_COLORS: Record<string, string> = {
  BUY: "var(--chart-1)",
  SELL: "var(--chart-2)",
  REQUEST: "var(--chart-3)",
  CLAIM: "var(--chart-4)",
  TRANSFER: "var(--chart-5)",
};

/** Time range: Today (hourly), 7/14/30 days (daily), 90 days (weekly). */
export type TimeRangeKey = "today" | "7" | "14" | "30" | "90";

const TIME_RANGE_OPTIONS: { value: TimeRangeKey; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7", label: "7 days" },
  { value: "14", label: "14 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
];

export type TransactionTimePoint = {
  date: string;
  dateTs: number;
  total: number;
  BUY: number;
  SELL: number;
  REQUEST: number;
  CLAIM: number;
  TRANSFER: number;
};

/** Normalize so chart always gets an array (handles serialization / undefined from server→client). */
function normalizeTransactions(
  transactions: TransactionRow[] | undefined | null
): TransactionRow[] {
  if (Array.isArray(transactions)) return transactions;
  return [];
}

/** Build time-series: hourly for today, daily for 7/14/30 days, weekly for 90 days. */
function buildTimeChartData(
  transactions: TransactionRow[],
  range: TimeRangeKey
): TransactionTimePoint[] {
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const isWeekly = range === "90";
  const isToday = range === "today";

  if (isToday) {
    const hourStarts: number[] = [];
    for (let h = 0; h < 24; h++) {
      hourStarts.push(setHours(startOfDay(now), h).getTime());
    }

    const byHourAndType = new Map<string, Record<string, number>>();
    hourStarts.forEach((ts) => {
      const row: Record<string, number> = { total: 0 };
      TYPE_ORDER.forEach((type) => {
        row[type] = 0;
      });
      byHourAndType.set(ts.toString(), row);
    });

    const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;
    for (const t of transactions) {
      const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
      const ts = created.getTime();
      if (ts < todayStart || ts >= tomorrowStart) continue;
      const hourStart = setHours(startOfDay(created), created.getHours()).getTime();
      const key = hourStart.toString();
      const type = (t.type?.toUpperCase() || "OTHER") as string;
      if (byHourAndType.has(key)) {
        const row = byHourAndType.get(key)!;
        if (TYPE_ORDER.includes(type as (typeof TYPE_ORDER)[number])) {
          row[type] = (row[type] ?? 0) + 1;
          row.total += 1;
        }
      }
    }

    return hourStarts.map((ts) => {
      const date = new Date(ts);
      const dateStr = format(date, "h a");
      const row = byHourAndType.get(ts.toString())!;
      return {
        date: dateStr,
        dateTs: ts,
        total: row.total,
        BUY: row.BUY,
        SELL: row.SELL,
        REQUEST: row.REQUEST,
        CLAIM: row.CLAIM,
        TRANSFER: row.TRANSFER,
      };
    });
  }

  if (isWeekly) {
    const numWeeks = 13;
    const weekStarts: number[] = [];
    for (let i = 0; i < numWeeks; i++) {
      const w = startOfWeek(subWeeks(now, numWeeks - 1 - i), { weekStartsOn: 1 });
      weekStarts.push(w.getTime());
    }

    const byWeekAndType = new Map<string, Record<string, number>>();
    weekStarts.forEach((ts) => {
      const row: Record<string, number> = { total: 0 };
      TYPE_ORDER.forEach((type) => {
        row[type] = 0;
      });
      byWeekAndType.set(ts.toString(), row);
    });

    for (const t of transactions) {
      const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
      const weekStart = startOfWeek(created, { weekStartsOn: 1 }).getTime();
      const key = weekStart.toString();
      const type = (t.type?.toUpperCase() || "OTHER") as string;
      if (byWeekAndType.has(key)) {
        const row = byWeekAndType.get(key)!;
        if (TYPE_ORDER.includes(type as (typeof TYPE_ORDER)[number])) {
          row[type] = (row[type] ?? 0) + 1;
          row.total += 1;
        }
      }
    }

    return weekStarts.map((ts) => {
      const date = new Date(ts);
      const dateStr = `Wk ${format(date, "MMM d")}`;
      const row = byWeekAndType.get(ts.toString())!;
      return {
        date: dateStr,
        dateTs: ts,
        total: row.total,
        BUY: row.BUY,
        SELL: row.SELL,
        REQUEST: row.REQUEST,
        CLAIM: row.CLAIM,
        TRANSFER: row.TRANSFER,
      };
    });
  }

  const numDays = Number(range);
  const dayStarts: number[] = [];
  for (let i = 0; i < numDays; i++) {
    const d = startOfDay(subDays(now, numDays - 1 - i));
    dayStarts.push(d.getTime());
  }

  const byDayAndType = new Map<string, Record<string, number>>();
  dayStarts.forEach((ts) => {
    const row: Record<string, number> = { total: 0 };
    TYPE_ORDER.forEach((type) => {
      row[type] = 0;
    });
    byDayAndType.set(ts.toString(), row);
  });

  for (const t of transactions) {
    const created = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt);
    const dayStart = startOfDay(created).getTime();
    const key = dayStart.toString();
    const type = (t.type?.toUpperCase() || "OTHER") as string;
    if (byDayAndType.has(key)) {
      const row = byDayAndType.get(key)!;
      if (TYPE_ORDER.includes(type as (typeof TYPE_ORDER)[number])) {
        row[type] = (row[type] ?? 0) + 1;
        row.total += 1;
      }
    }
  }

  return dayStarts.map((ts) => {
    const date = new Date(ts);
    const dateStr = format(date, "MMM d");
    const row = byDayAndType.get(ts.toString())!;
    return {
      date: dateStr,
      dateTs: ts,
      total: row.total,
      BUY: row.BUY,
      SELL: row.SELL,
      REQUEST: row.REQUEST,
      CLAIM: row.CLAIM,
      TRANSFER: row.TRANSFER,
    };
  });
}

function getRangeSubtitle(range: TimeRangeKey): string {
  if (range === "today") return "By type · count per hour (today)";
  if (range === "90") return "By type · count per week (last 90 days)";
  return `By type · count per day (last ${range} days)`;
}

export function TransactionsTimeChart({
  transactions: rawTransactions,
}: {
  transactions?: TransactionRow[] | null;
}) {
  const [range, setRange] = useState<TimeRangeKey>("30");
  const transactions = useMemo(
    () => normalizeTransactions(rawTransactions),
    [rawTransactions]
  );
  const chartData = useMemo(
    () => buildTimeChartData(transactions, range),
    [transactions, range]
  );
  const maxStack = useMemo(() => {
    let m = 0;
    for (const d of chartData) {
      const stack = TYPE_ORDER.reduce((s, t) => s + (d[t] ?? 0), 0);
      m = Math.max(m, stack, d.total);
    }
    return Math.max(1, m);
  }, [chartData]);

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 pb-2">
        <div>
          <p className="text-sm font-medium text-slate-500">Transactions over time</p>
          <p className="text-xs text-slate-400">{getRangeSubtitle(range)}</p>
        </div>
        <Select value={range} onValueChange={(v) => setRange(v as TimeRangeKey)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Range" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[220px] w-full min-w-0">
          <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
              >
                <defs>
                  {TYPE_ORDER.map((type) => (
                    <linearGradient
                      key={type}
                      id={`time-${type}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor={TYPE_COLORS[type] ?? "var(--muted-foreground)"}
                        stopOpacity={0.4}
                      />
                      <stop
                        offset="100%"
                        stopColor={TYPE_COLORS[type] ?? "var(--muted-foreground)"}
                        stopOpacity={0}
                      />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-slate-200"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                />
                <YAxis
                  width={36}
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, maxStack]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.[0]?.payload) {
                      const p = payload[0].payload as TransactionTimePoint;
                      const parts = TYPE_ORDER.filter((t) => (p[t] ?? 0) > 0).map(
                        (t) => `${t}: ${p[t]}`
                      );
                      return (
                        <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 shadow-sm">
                          <p className="mb-1.5 font-medium text-slate-900">{p.date}</p>
                          <p className="text-muted-foreground">
                            Total: {p.total} transaction{p.total === 1 ? "" : "s"}
                          </p>
                          {parts.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {parts.map((s) => (
                                <li key={s}>{s}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11 }}
                  formatter={(value) => (
                    <span style={{ color: "var(--muted-foreground)" }}>{value}</span>
                  )}
                />
                {TYPE_ORDER.map((type) => (
                  <Area
                    key={type}
                    type="monotone"
                    dataKey={type}
                    stackId="stack"
                    stroke={TYPE_COLORS[type] ?? "var(--muted-foreground)"}
                    strokeWidth={1.5}
                    fill={`url(#time-${type})`}
                    name={type}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

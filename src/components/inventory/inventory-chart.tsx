"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryHistoryPoint } from "@/lib/data-inventory";

function EmptyHistoryState() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
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
            No history data yet. Once you have activity, it'll show up here.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryChart({ data }: { data: InventoryHistoryPoint[] }) {
  if (data.length === 0) {
    return <EmptyHistoryState />;
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
        <p className="text-sm text-muted-foreground">
          Balance over time (from inventory history).
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
                formatter={(value: number) => [value.toLocaleString(), "Balance"]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="balance"
                stroke="var(--chart-1)"
                strokeWidth={2}
                dot={{ fill: "var(--chart-1)", strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

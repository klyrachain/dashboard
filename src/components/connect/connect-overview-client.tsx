"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatCurrency } from "@/lib/data-balances";
import type { ConnectOverview, VolumeByPartnerItem } from "@/lib/data-connect";
import { format } from "date-fns";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--muted-foreground)"];

type ConnectOverviewClientProps = {
  data: ConnectOverview;
};

export function ConnectOverviewClient({ data }: ConnectOverviewClientProps) {
  const chartData = data.volumeByPartner.map((p: VolumeByPartnerItem) => ({
    name: p.businessId === "_others" ? "Others" : p.businessName,
    volume: p.volume,
    fullName: p.businessName,
  }));

  const takeRatePercent = data.totalPlatformVolume > 0
    ? (data.takeRate * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-8">
      {/* Row 1: Platform metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Total Platform Volume</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {formatCurrency(data.totalPlatformVolume)}
            </p>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Net Revenue (Fees)</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {formatCurrency(data.netRevenueFees)}
            </p>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Active Merchants</p>
            <p className="text-3xl font-semibold tracking-tight text-slate-900">
              {data.activeMerchants}
            </p>
          </CardHeader>
        </Card>
      </div>

      {/* Row 2: Volume by partner + take rate */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="bg-white lg:col-span-2">
          <CardHeader>
            <p className="text-sm font-medium text-slate-700">Volume by Partner</p>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 4, right: 8, left: 4, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-100" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `$${v}`} />
                    <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), "Volume"]}
                      contentStyle={{ fontSize: "12px" }}
                    />
                    <Bar dataKey="volume" radius={[0, 4, 4, 0]} maxBarSize={24}>
                      {chartData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-center">
                <p className="text-sm font-medium text-slate-500">No volume data</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader>
            <p className="text-sm font-medium text-slate-700">Take Rate</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-4">
            <p className="text-4xl font-semibold tracking-tight text-slate-900">
              {takeRatePercent}%
            </p>
            <p className="text-xs text-slate-500 mt-1">Average fee margin</p>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Recent Onboarding */}
      <Card className="bg-white">
        <CardHeader>
          <p className="text-sm font-medium text-slate-700">Recent Onboarding</p>
          <p className="text-xs text-slate-500">Latest merchants with API keys</p>
        </CardHeader>
        <CardContent>
          {data.recentOnboarding.length > 0 ? (
            <ul className="space-y-2">
              {data.recentOnboarding.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-md border border-slate-100 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-slate-900">{m.name}</span>
                  <span className="text-slate-500">{m.slug}</span>
                  <span className="text-xs text-slate-400">
                    {m.createdAt ? format(new Date(m.createdAt), "MMM d, yyyy") : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">No recent onboarding</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

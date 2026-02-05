"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RelativeTime } from "@/components/ui/relative-time";
import type { VolumeChartPoint } from "@/lib/data-dashboard";

type HeroVolumeCardsProps = {
  grossValue: string;
  netValue: string;
  feeValue: string;
  grossChartData: VolumeChartPoint[];
  netChartData: VolumeChartPoint[];
  feeChartData: VolumeChartPoint[];
  /** ISO date string for "last updated"; displayed as relative time (e.g. "Updated 5 minutes ago"). */
  updatedAt: string;
  grossPrevious: { value: number; changePercent: number };
  netPrevious: { value: number; changePercent: number };
  feePrevious: { value: number; changePercent: number };
};

function EmptyVolumeChart() {
  return (
    <div className="flex h-[140px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 text-center">
      <p className="text-sm font-medium text-slate-500">No data</p>
      <p className="text-xs text-slate-400">Volume data will appear here.</p>
    </div>
  );
}

export function HeroVolumeCards({
  grossValue,
  netValue,
  feeValue,
  grossChartData,
  netChartData,
  feeChartData,
  updatedAt,
  grossPrevious,
  netPrevious,
  feePrevious,
}: HeroVolumeCardsProps) {
  const hasGrossData =
    grossChartData.length > 0 && grossValue !== "0" && grossValue !== "0.00";
  const hasNetData =
    netChartData.length > 0 && netValue !== "0" && netValue !== "0.00";
  const hasFeeData =
    feeChartData.length > 0 && feeValue !== "0" && feeValue !== "0.00";

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-slate-500">Gross volume</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">
            ${grossValue}
          </p>
          <p className="text-xs text-slate-500">
            <RelativeTime date={updatedAt} prefix="Updated " />
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[140px] w-full">
            {hasGrossData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={grossChartData}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="grossGradient"
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
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]?.payload) {
                        const p = payload[0].payload as VolumeChartPoint;
                        return (
                          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            {p.label}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#grossGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyVolumeChart />
            )}
          </div>
          {hasGrossData && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>
                ${grossValue} {grossPrevious.changePercent}%
              </span>
              <span>${grossPrevious.value.toFixed(2)} previous period</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-slate-500">Realized revenue</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">
            ${feeValue}
          </p>
          <p className="text-xs text-slate-500">
            <RelativeTime date={updatedAt} prefix="Updated " />
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[140px] w-full">
            {hasFeeData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={feeChartData}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="realizedGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--chart-2)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-2)"
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
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]?.payload) {
                        const p = payload[0].payload as VolumeChartPoint;
                        return (
                          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            {p.label}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    fill="url(#realizedGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyVolumeChart />
            )}
          </div>
          {hasFeeData && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>
                ${feeValue} {feePrevious.changePercent}%
              </span>
              <span>${feePrevious.value.toFixed(2)} previous period</span>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader className="pb-2">
          <p className="text-sm font-medium text-slate-500">Net volume</p>
          <p className="text-3xl font-semibold tracking-tight text-slate-900">
            ${netValue}
          </p>
          <p className="text-xs text-slate-500">
            <RelativeTime date={updatedAt} prefix="Updated " />
          </p>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[140px] w-full">
            {hasNetData ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={netChartData}
                  margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                >
                  <defs>
                    <linearGradient
                      id="netGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="var(--chart-3)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="100%"
                        stopColor="var(--chart-3)"
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
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <YAxis hide domain={["auto", "auto"]} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]?.payload) {
                        const p = payload[0].payload as VolumeChartPoint;
                        return (
                          <div className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-700">
                            {p.label}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-3)"
                    strokeWidth={2}
                    fill="url(#netGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <EmptyVolumeChart />
            )}
          </div>
          {hasNetData && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
              <span>
                ${netValue} {netPrevious.changePercent}%
              </span>
              <span>${netPrevious.value.toFixed(2)} previous period</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import * as React from "react";
import { useSelector } from "react-redux";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { HeroVolumeCards } from "@/components/dashboard/hero-volume-cards";
import { getDashboardVolumeAction } from "@/app/dashboard/actions";
import type {
  VolumeDateRange,
  VolumeGranularity,
  VolumeChartResult,
} from "@/lib/data-dashboard";
import { volumeLoadError } from "@/lib/user-feedback-copy";
import { selectWebhookLastTrigger } from "@/store/webhook-slice";

const DEFAULT_RANGE: VolumeDateRange = "7d";
const DEFAULT_GRANULARITY: VolumeGranularity = "daily";

function formatVolume(value: number | undefined | null): string {
  const n = value ?? 0;
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function DashboardVolumeSection() {
  const webhookTrigger = useSelector(selectWebhookLastTrigger);
  const [dateRange, setDateRange] =
    React.useState<VolumeDateRange>(DEFAULT_RANGE);
  const [granularity, setGranularity] =
    React.useState<VolumeGranularity>(DEFAULT_GRANULARITY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [data, setData] = React.useState<VolumeChartResult | null>(null);

  const fetchVolume = React.useCallback(
    async (
      range: VolumeDateRange,
      gran: VolumeGranularity,
      isBackgroundRefetch: boolean
    ) => {
      if (!isBackgroundRefetch) {
        setLoading(true);
      }
      setError(null);
      try {
        const result = await getDashboardVolumeAction(range, gran);
        setData({
          grossSeries: result.grossSeries,
          netSeries: result.netSeries,
          feeSeries: result.feeSeries,
          grossTotal: result.grossTotal,
          netTotal: result.netTotal,
          feeTotal: result.feeTotal,
          updatedAt: result.updatedAt,
          grossPrevious: result.grossPrevious,
          netPrevious: result.netPrevious,
          feePrevious: result.feePrevious,
        });
      } catch {
        setError(volumeLoadError);
        if (!isBackgroundRefetch) setData(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  React.useEffect(() => {
    void fetchVolume(dateRange, granularity, false);
  }, [dateRange, granularity, fetchVolume]);

  React.useEffect(() => {
    if (webhookTrigger === 0) return;
    void fetchVolume(dateRange, granularity, true);
  }, [webhookTrigger, dateRange, granularity, fetchVolume]);

  const handleRangeChange = (value: string) => {
    const next = value as VolumeDateRange;
    setDateRange(next);
    if (next === "24h") setGranularity("hourly");
  };

  const handleGranularityChange = (value: string) => {
    setGranularity(value as VolumeGranularity);
  };

  const grossValue = data ? formatVolume(data.grossTotal) : "0.00";
  const netValue = data ? formatVolume(data.netTotal) : "0.00";
  const feeValue = data ? formatVolume(data.feeTotal) : "0.00";
  const grossChartData = data?.grossSeries ?? [];
  const netChartData = data?.netSeries ?? [];
  const feeChartData = data?.feeSeries ?? [];
  const updatedAt =
    data?.updatedAt?.toISOString() ?? new Date().toISOString();
  const grossPrevious = data?.grossPrevious ?? {
    value: 0,
    changePercent: 0,
  };
  const netPrevious = data?.netPrevious ?? {
    value: 0,
    changePercent: 0,
  };
  const feePrevious = data?.feePrevious ?? {
    value: 0,
    changePercent: 0,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Today
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-500">Date range</span>
            <Select
              value={dateRange}
              onValueChange={handleRangeChange}
              disabled={loading}
            >
              <SelectTrigger className="h-8 w-[130px] bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={dateRange === "24h" ? "hourly" : granularity}
              onValueChange={handleGranularityChange}
              disabled={loading || dateRange === "24h"}
            >
              <SelectTrigger className="h-8 w-[100px] bg-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="hourly">Hourly</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              className="h-8 bg-white text-sm"
              disabled
            >
              Compare previous period
            </Button>
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      {loading && !data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="h-[240px] animate-pulse rounded-lg bg-slate-100" />
          <div className="h-[240px] animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <HeroVolumeCards
          grossValue={grossValue}
          netValue={netValue}
          feeValue={feeValue}
          grossChartData={grossChartData}
          netChartData={netChartData}
          feeChartData={feeChartData}
          updatedAt={updatedAt}
          grossPrevious={grossPrevious}
          netPrevious={netPrevious}
          feePrevious={feePrevious}
        />
      )}
    </div>
  );
}

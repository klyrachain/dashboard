"use client";

import * as React from "react";
import type { MerchantWebhookEndpointSummary } from "@/types/merchant-api";
import { cn } from "@/lib/utils";

const CHART_W = 420;
const CHART_H = 172;
const PAD = { t: 14, r: 16, b: 38, l: 40 };

function lastNDatesISO(n: number): string[] {
  const out: string[] = [];
  const to = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(to.getTime() - i * 86_400_000);
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

function demoVolumeBuckets(): MerchantWebhookEndpointSummary["buckets"] {
  const dates = lastNDatesISO(14);
  return dates.map((date, i) => ({
    date,
    successCount: Math.max(0, Math.round(5 + Math.sin(i * 0.45) * 4 + i * 0.35)),
    failureCount: Math.max(0, Math.round(2 + Math.cos(i * 0.55) * 1.8 + (i % 3))),
  }));
}

function demoLatencyByDay(): NonNullable<MerchantWebhookEndpointSummary["latencyByDay"]> {
  const dates = lastNDatesISO(14);
  return dates.map((date, i) => {
    const base = 38 + i * 2.2 + Math.sin(i * 0.6) * 10;
    return {
      date,
      minMs: Math.max(8, Math.round(base * 0.55)),
      avgMs: Math.max(12, Math.round(base)),
      maxMs: Math.max(20, Math.round(base * 1.4)),
    };
  });
}

/** At most `max` tick labels, always including first and last, evenly spaced to avoid cramped dates. */
function labelTickIndices(len: number, max = 6): Set<number> {
  if (len <= 0) return new Set();
  if (len <= max) return new Set(Array.from({ length: len }, (_, i) => i));
  const out = new Set<number>([0, len - 1]);
  const innerSlots = max - 2;
  for (let k = 1; k <= innerSlots; k++) {
    out.add(Math.round((k * (len - 1)) / (innerSlots + 1)));
  }
  return out;
}

function volumeHasRealData(buckets: MerchantWebhookEndpointSummary["buckets"]): boolean {
  if (!buckets.length) return false;
  return buckets.some((b) => b.successCount > 0 || b.failureCount > 0);
}

function polylinePoints(
  values: number[],
  width: number,
  height: number,
  maxY: number
): string {
  if (!values.length) return "";
  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const m = Math.max(maxY, 1);
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values
    .map((v, i) => {
      const x = PAD.l + i * step;
      const y = PAD.t + innerH - (v / m) * innerH;
      return `${x},${y}`;
    })
    .join(" ");
}

function areaUnderPoints(
  values: number[],
  width: number,
  height: number,
  maxY: number
): string {
  if (!values.length) return "";
  const innerW = width - PAD.l - PAD.r;
  const innerH = height - PAD.t - PAD.b;
  const m = Math.max(maxY, 1);
  const step = values.length > 1 ? innerW / (values.length - 1) : 0;
  const bottom = PAD.t + innerH;
  const pts = values.map((v, i) => {
    const x = PAD.l + i * step;
    const y = PAD.t + innerH - (v / m) * innerH;
    return { x, y };
  });
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return "";
  let d = `M ${first.x} ${bottom} L ${first.x} ${first.y}`;
  for (let i = 1; i < pts.length; i++) {
    d += ` L ${pts[i].x} ${pts[i].y}`;
  }
  d += ` L ${last.x} ${bottom} Z`;
  return d;
}

export function WebhookDeliveryVolumeChart({
  buckets,
  className,
}: {
  buckets: MerchantWebhookEndpointSummary["buckets"];
  className?: string;
}) {
  const gid = React.useId().replace(/:/g, "");
  const placeholder = !volumeHasRealData(buckets);
  const displayBuckets = placeholder ? demoVolumeBuckets() : buckets;
  const success = displayBuckets.map((b) => b.successCount);
  const failure = displayBuckets.map((b) => b.failureCount);
  const maxY = Math.max(1, ...success, ...failure);
  const labels = displayBuckets.map((b) => {
    const d = new Date(b.date + "T12:00:00Z");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
  const tickIdx = labelTickIndices(labels.length);

  const successPts = polylinePoints(success, CHART_W, CHART_H, maxY);
  const failurePts = polylinePoints(failure, CHART_W, CHART_H, maxY);
  const successArea = areaUnderPoints(success, CHART_W, CHART_H, maxY);
  const failureArea = areaUnderPoints(failure, CHART_W, CHART_H, maxY);

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 shadow-sm", className)}>
      <h3 className="font-primary text-sm font-semibold text-foreground">Delivery volume</h3>
      <p className="mt-0.5 font-secondary text-caption text-muted-foreground">
        Successful and failed deliveries over time.
      </p>
      {placeholder ? (
        <p className="mt-1 text-[11px] font-medium text-primary/80">Preview — deliveries will plot here for this range.</p>
      ) : null}
      <svg
        width="100%"
        height={CHART_H}
        className={cn("mt-2 min-h-[172px] w-full max-w-full", placeholder && "opacity-95")}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id={`wh-vol-fail-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity="0.38" />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`wh-vol-ok-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {failureArea ? <path d={failureArea} fill={`url(#wh-vol-fail-fill-${gid})`} /> : null}
        {successArea ? <path d={successArea} fill={`url(#wh-vol-ok-fill-${gid})`} /> : null}
        <polyline
          fill="none"
          stroke="hsl(var(--destructive))"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={failurePts}
        />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={successPts}
        />
        {labels.map((lab, i) => {
          if (!tickIdx.has(i)) return null;
          const innerW = CHART_W - PAD.l - PAD.r;
          const step = labels.length > 1 ? innerW / (labels.length - 1) : 0;
          const x = PAD.l + i * step;
          return (
            <text
              key={lab + i}
              x={x}
              y={CHART_H - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {lab}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" aria-hidden /> Success
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-destructive" aria-hidden /> Failed
        </span>
      </div>
    </div>
  );
}

function latencyHasRealData(rows: MerchantWebhookEndpointSummary["latencyByDay"]): boolean {
  if (!rows?.length) return false;
  return rows.some((d) => d.minMs > 0 || d.avgMs > 0 || d.maxMs > 0);
}

export function WebhookResponseTimesChart({
  latencyByDay,
  className,
}: {
  latencyByDay: MerchantWebhookEndpointSummary["latencyByDay"];
  className?: string;
}) {
  const gid = React.useId().replace(/:/g, "");
  const placeholder = !latencyHasRealData(latencyByDay);
  const display = placeholder ? demoLatencyByDay() : latencyByDay ?? [];

  const mins = display.map((d) => d.minMs);
  const avgs = display.map((d) => d.avgMs);
  const maxs = display.map((d) => d.maxMs);
  const maxY = Math.max(1, ...mins, ...avgs, ...maxs);
  const labels = display.map((b) => {
    const d = new Date(b.date + "T12:00:00Z");
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });
  const tickIdx = labelTickIndices(labels.length);

  const minPts = polylinePoints(mins, CHART_W, CHART_H, maxY);
  const avgPts = polylinePoints(avgs, CHART_W, CHART_H, maxY);
  const maxPts = polylinePoints(maxs, CHART_W, CHART_H, maxY);
  const maxArea = areaUnderPoints(maxs, CHART_W, CHART_H, maxY);
  const avgArea = areaUnderPoints(avgs, CHART_W, CHART_H, maxY);

  return (
    <div className={cn("rounded-lg border border-border bg-card p-3 shadow-sm", className)}>
      <h3 className="font-primary text-sm font-semibold text-foreground">Response times</h3>
      <p className="mt-0.5 font-secondary text-caption text-muted-foreground">
        Min, avg, and max response time per day (ms).
      </p>
      {placeholder ? (
        <p className="mt-1 text-[11px] font-medium text-primary/80">
          Preview — lines reflect sample timing until <code className="font-mono text-[10px]">durationMs</code> is
          recorded on deliveries.
        </p>
      ) : null}
      <svg
        width="100%"
        height={CHART_H}
        className={cn("mt-2 min-h-[172px] w-full max-w-full", placeholder && "opacity-95")}
        viewBox={`0 0 ${CHART_W} ${CHART_H}`}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden
      >
        <defs>
          <linearGradient id={`wh-lat-max-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgb(251 146 60)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="rgb(251 146 60)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={`wh-lat-avg-fill-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.28" />
            <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {maxArea ? <path d={maxArea} fill={`url(#wh-lat-max-fill-${gid})`} /> : null}
        {avgArea ? <path d={avgArea} fill={`url(#wh-lat-avg-fill-${gid})`} /> : null}
        <polyline
          fill="none"
          stroke="rgb(34 197 94)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={minPts}
        />
        <polyline
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={avgPts}
        />
        <polyline
          fill="none"
          stroke="rgb(251 146 60)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={maxPts}
        />
        {labels.map((lab, i) => {
          if (!tickIdx.has(i)) return null;
          const innerW = CHART_W - PAD.l - PAD.r;
          const step = labels.length > 1 ? innerW / (labels.length - 1) : 0;
          const x = PAD.l + i * step;
          return (
            <text
              key={lab + i}
              x={x}
              y={CHART_H - 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[11px]"
            >
              {lab}
            </text>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap gap-3 text-caption text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-green-500" aria-hidden /> Min
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary" aria-hidden /> Avg
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-orange-400" aria-hidden /> Max
        </span>
      </div>
    </div>
  );
}

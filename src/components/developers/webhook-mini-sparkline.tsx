"use client";

import { cn } from "@/lib/utils";

type WebhookMiniSparklineProps = {
  values: number[];
  /** When true, values are already in 0..1 (e.g. success ratios). */
  normalized?: boolean;
  className?: string;
};

export function WebhookMiniSparkline({
  values,
  normalized = false,
  className,
}: WebhookMiniSparklineProps) {
  const w = 72;
  const h = 28;
  if (!values.length) {
    return (
      <svg
        width={w}
        height={h}
        className={cn("text-muted-foreground/35", className)}
        aria-hidden
      >
        <line
          x1={4}
          y1={h / 2}
          x2={w - 4}
          y2={h / 2}
          stroke="currentColor"
          strokeWidth={1}
        />
      </svg>
    );
  }
  const max = normalized ? 1 : Math.max(...values, 1);
  const step = values.length > 1 ? (w - 8) / (values.length - 1) : 0;
  const points = values
    .map((v, i) => {
      const x = 4 + i * step;
      const nv = normalized ? v : v / max;
      const y = h - 4 - nv * (h - 8);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} className={cn("text-primary", className)} aria-hidden>
      <polyline fill="none" stroke="currentColor" strokeWidth="1.5" points={points} />
    </svg>
  );
}

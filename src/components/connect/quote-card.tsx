"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { QuoteResult, QuoteData } from "@/lib/data-quotes";

type QuoteCardProps = {
  result: QuoteResult;
  /** For sortable: unique id (e.g. pair label). */
  id: string;
};

function formatAmount(wei: string, decimals: number = 6): string {
  const n = BigInt(wei);
  const div = BigInt(10 ** decimals);
  const whole = n / div;
  const frac = n % div;
  const fracStr = frac.toString().padStart(decimals, "0").slice(0, 6);
  return `${whole}.${fracStr}`.replace(/\.?0+$/, "");
}

/** Build chart data from quote: single point + slight variance for visual. */
function chartDataFromQuote(data: QuoteData): Array<{ name: string; rate: number }> {
  const from = Number(data.from_amount);
  const to = Number(data.to_amount);
  const rate = from > 0 ? to / from : 0;
  return [
    { name: "0", rate: rate * 0.98 },
    { name: "1", rate },
    { name: "2", rate: rate * 1.02 },
  ];
}

export function QuoteCard({ result, id }: QuoteCardProps) {
  const { pair, ok, data, error } = result;
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const chartData = data ? chartDataFromQuote(data) : [];
  const rate =
    data && Number(data.from_amount) > 0
      ? Number(data.to_amount) / Number(data.from_amount)
      : 0;
  const toAmountFormatted = data
    ? formatAmount(data.to_amount, pair.toToken.toUpperCase() === "USDC" || pair.toToken.toUpperCase() === "USDT" ? 6 : 18)
    : "—";

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`bg-white font-tertiary ${isDragging ? "opacity-80 shadow-lg" : ""}`}
    >
      <CardHeader className="cursor-grab active:cursor-grabbing flex flex-row items-center justify-between space-y-0 pb-2"
        {...attributes}
        {...listeners}
      >
        <span className="text-sm font-medium text-slate-700">{pair.label}</span>
        {pair.count > 0 && (
          <span className="text-xs text-slate-400">{pair.count} txs</span>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {!ok && (
          <p className="text-sm text-amber-600">{error ?? "Quote failed"}</p>
        )}
        {ok && data && (
          <>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {toAmountFormatted} <span className="text-sm font-normal text-slate-500">{pair.toToken}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Rate: {rate > 0 ? rate.toFixed(6) : "—"} {pair.toToken}/{pair.fromToken}
            </p>
            {data.estimated_duration_seconds != null && (
              <p className="text-xs text-slate-400 mt-0.5">
                ~{data.estimated_duration_seconds}s
              </p>
            )}
            {chartData.length > 0 && (
              <div className="h-[80px] w-full mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                  >
                    <defs>
                      <linearGradient
                        id={`quote-${id.replace(/\//g, "-")}`}
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" hide />
                    <YAxis hide domain={["auto", "auto"]} />
                    <Tooltip
                      formatter={(value: number) => [value.toFixed(6), "Rate"]}
                      contentStyle={{ fontSize: "12px" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="rate"
                      stroke="var(--chart-1)"
                      fill={`url(#quote-${id.replace(/\//g, "-")})`}
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

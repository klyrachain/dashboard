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
import {
  getTokenDecimalsForWei,
  formatTokenAmountFromWei,
  formatTokenRate,
} from "@/lib/format-token";
import { mapQuoteError } from "@/lib/user-feedback-copy";

type QuoteCardProps = {
  result: QuoteResult;
  /** For sortable: unique id (e.g. pair label). */
  id: string;
};


/** Human-readable rate: (to_amount / 10^toDec) / (from_amount / 10^fromDec) = units of toToken per 1 fromToken. */
function humanRate(
  fromAmountWei: string,
  toAmountWei: string,
  fromDecimals: number,
  toDecimals: number
): number {
  const from = Number(fromAmountWei);
  const to = Number(toAmountWei);
  if (from <= 0) return 0;
  const fromHuman = from / 10 ** fromDecimals;
  const toHuman = to / 10 ** toDecimals;
  return fromHuman > 0 ? toHuman / fromHuman : 0;
}

/** Build chart data from quote: human rate + slight variance for visual. */
function chartDataFromQuote(
  data: QuoteData,
  fromDecimals: number,
  toDecimals: number
): Array<{ name: string; rate: number }> {
  const rate = humanRate(data.from_amount, data.to_amount, fromDecimals, toDecimals);
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

  const fromDecimals = getTokenDecimalsForWei(pair.fromToken);
  const toDecimals = getTokenDecimalsForWei(pair.toToken);
  const chartData = data ? chartDataFromQuote(data, fromDecimals, toDecimals) : [];
  const rateHuman =
    data && Number(data.from_amount) > 0
      ? humanRate(data.from_amount, data.to_amount, fromDecimals, toDecimals)
      : 0;
  const toAmountFormatted = data
    ? formatTokenAmountFromWei(data.to_amount, pair.toToken)
    : "—";
  const rateFormatted = rateHuman > 0 ? formatTokenRate(rateHuman, pair.toToken) : "—";

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
          <div className="flex min-h-[140px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-6 text-center h-[140px]">
            <p className="text-sm font-medium text-slate-500">No data available</p>
            <p className="text-xs text-slate-500">
              {error === "Loading…" ? "Loading…" : mapQuoteError(error)}
            </p>
          </div>
        )}
        {ok && data && (
          <>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {toAmountFormatted} <span className="text-sm font-normal text-slate-500">{pair.toToken}</span>
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Rate: {rateFormatted} {pair.toToken}/{pair.fromToken}
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
                      formatter={(value: number) => [formatTokenRate(value, pair.toToken), "Rate"]}
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

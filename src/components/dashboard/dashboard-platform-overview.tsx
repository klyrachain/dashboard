"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import type { PlatformOverview } from "@/lib/data-platform";

type DashboardPlatformOverviewProps = {
  data: PlatformOverview | null;
  error?: string | null;
  /** When true, only render the "By pair" table (for use in At a glance). */
  pairsOnly?: boolean;
};

function formatUsd(value: string): string {
  const n = Number.parseFloat(value.replace(/,/g, ""));
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function pairTypeVariant(
  type: string
): "default" | "secondary" | "outline" | "success" | "destructive" {
  switch (type) {
    case "ONRAMP":
      return "success";
    case "OFF_RAMP":
      return "secondary";
    case "SWAP":
      return "outline";
    default:
      return "default";
  }
}

export function DashboardPlatformOverview({
  data,
  error,
  pairsOnly = false,
}: DashboardPlatformOverviewProps) {
  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm text-amber-800">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { overview, pairs } = data;

  if (pairsOnly) {
    if (pairs.length === 0) return null;
    return (
      <Card className="bg-white">
        <CardHeader>
          <p className="text-sm font-medium text-slate-700">By pair</p>
          <p className="text-xs text-slate-500">
            Volume, fees, and realized revenue per trading pair
          </p>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Symbol</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Volume (USD)</TableHead>
                <TableHead>Fees</TableHead>
                <TableHead className="text-right">Revenue (USD)</TableHead>
                <TableHead className="text-right">Count</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pairs.map((pair, i) => (
                <TableRow key={`${pair.symbol}-${pair.type}-${i}`}>
                  <TableCell className="font-mono text-sm">{pair.symbol}</TableCell>
                  <TableCell>
                    <Badge variant={pairTypeVariant(pair.type)}>{pair.type}</Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(pair.volumeUsd)}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {pair.fees.amount && pair.fees.currency
                      ? `${pair.fees.amount} ${pair.fees.currency}`
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatUsd(pair.realizedRevenueUsd)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {pair.count.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-muted-foreground">
        Platform overview (all transactions)
      </h3>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Gross volume (USD)</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {formatUsd(overview.grossVolumeUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Realized revenue (USD)</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {formatUsd(overview.realizedRevenueUsd)}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-slate-500">Total transactions</p>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tracking-tight text-slate-900">
              {overview.totalTxCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {pairs.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <p className="text-sm font-medium text-slate-700">By pair</p>
            <p className="text-xs text-slate-500">
              Volume, fees, and realized revenue per trading pair
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Symbol</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Volume (USD)</TableHead>
                  <TableHead>Fees</TableHead>
                  <TableHead className="text-right">Revenue (USD)</TableHead>
                  <TableHead className="text-right">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairs.map((pair, i) => (
                  <TableRow key={`${pair.symbol}-${pair.type}-${i}`}>
                    <TableCell className="font-mono text-sm">{pair.symbol}</TableCell>
                    <TableCell>
                      <Badge variant={pairTypeVariant(pair.type)}>{pair.type}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(pair.volumeUsd)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {pair.fees.amount && pair.fees.currency
                        ? `${pair.fees.amount} ${pair.fees.currency}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatUsd(pair.realizedRevenueUsd)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {pair.count.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

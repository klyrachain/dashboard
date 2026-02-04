"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LotRow, LotsListResult } from "@/lib/data-lots-chains";
import { lotsSummary } from "@/lib/data-lots-chains";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

type BaseQuery = {
  page?: number;
  limit?: number;
  assetId?: string;
  chain?: string;
};

type InventoryLotsSectionProps = {
  result: LotsListResult;
  currentLotsPage: number;
  currentLotsLimit: number;
  baseQuery: BaseQuery;
  /** When false, only table + pagination (summary is shown in overview). Default true. */
  showSummary?: boolean;
};

/** Summary cards only (for overview). */
export function InventoryLotsSummary({ result }: { result: LotsListResult }) {
  const { items, meta } = result;
  const summary = lotsSummary(items);
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <Card className="bg-white">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total lots</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-lg font-semibold tabular-nums">{meta.total}</p>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total quantity</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-lg font-semibold tabular-nums">
            {summary.totalQuantity.toLocaleString(undefined, { maximumFractionDigits: 6 })}
          </p>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader className="pb-1 pt-3 px-3">
          <CardTitle className="text-xs font-medium text-muted-foreground">Total cost (USD)</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-0">
          <p className="text-lg font-semibold tabular-nums">
            {summary.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function buildLotsQuery(
  lotsPage: number,
  lotsLimit: number,
  base: BaseQuery
): string {
  const params = new URLSearchParams();
  if (base.page != null) params.set("page", String(base.page));
  if (base.limit != null) params.set("limit", String(base.limit));
  if (base.assetId) params.set("assetId", base.assetId);
  if (base.chain) params.set("chain", base.chain);
  params.set("lotsPage", String(lotsPage));
  params.set("lotsLimit", String(lotsLimit));
  const q = params.toString();
  return q ? `?${q}` : "";
}

function LotTable({ items }: { items: LotRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center text-sm text-slate-500">
        <p>No lots</p>
        <p className="text-xs">Lots are created on purchase (FIFO).</p>
      </div>
    );
  }
  return (
    <Table>
      <TableHeader>
        <TableRow className="border-b border-slate-200 text-left text-muted-foreground">
          <TableHead className="w-[140px]">Token</TableHead>
          <TableHead className="w-[100px]">Chain</TableHead>
          <TableHead className="text-right">Original</TableHead>
          <TableHead className="text-right">Remaining</TableHead>
          <TableHead className="text-right">Cost (USD)</TableHead>
          <TableHead className="text-right">Total cost (USD)</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Acquired</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((lot) => (
          <TableRow key={lot.id} className="border-b border-slate-100">
            <TableCell className="font-medium">
              {lot.asset?.symbol ?? lot.assetId}
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {lot.asset?.chain ?? "—"}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {lot.originalQuantity}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {lot.remainingQuantity}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {lot.costPerTokenUsd}
            </TableCell>
            <TableCell className="tabular-nums text-right">
              {lot.totalCostUsd}
            </TableCell>
            <TableCell>
              <span
                className={
                  lot.status === "OPEN"
                    ? "text-green-600 text-xs font-medium"
                    : "text-muted-foreground text-xs"
                }
              >
                {lot.status}
              </span>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {lot.acquiredAt
                ? format(new Date(lot.acquiredAt), "MMM d, yyyy HH:mm")
                : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function InventoryLotsSection({
  result,
  currentLotsPage,
  currentLotsLimit,
  baseQuery,
  showSummary = true,
}: InventoryLotsSectionProps) {
  const { items, meta } = result;
  const totalPages = Math.max(1, Math.ceil(meta.total / currentLotsLimit));
  const canPrev = currentLotsPage > 1;
  const canNext = currentLotsPage < totalPages;

  return (
    <div className="space-y-4">
      {showSummary && (
        <>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Inventory lots</h2>
            <p className="text-sm text-muted-foreground">
              FIFO lots: tokens and prices we bought them at. Total and summary below.
            </p>
          </div>
          <InventoryLotsSummary result={result} />
        </>
      )}
      {/* Lots table + pagination */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Lots list</CardTitle>
          <p className="text-xs text-muted-foreground">
            Page {currentLotsPage} of {totalPages} · {items.length} of {meta.total} lots
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <LotTable items={items} />
          {meta.total > 0 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              {canPrev ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/inventory${buildLotsQuery(currentLotsPage - 1, currentLotsLimit, baseQuery)}`}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                    Previous
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled aria-label="Previous page">
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                Page {currentLotsPage} of {totalPages}
              </span>
              {canNext ? (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={`/inventory${buildLotsQuery(currentLotsPage + 1, currentLotsLimit, baseQuery)}`}
                    aria-label="Next page"
                  >
                    Next
                    <ChevronRight className="size-4" />
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" size="sm" disabled aria-label="Next page">
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

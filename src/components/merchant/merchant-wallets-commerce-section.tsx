"use client";

import { useMemo } from "react";
import type { MerchantSummary } from "@/types/merchant-api";
import type { TransactionRow } from "@/lib/data-transactions";
import {
  formatRollupTokenAmount,
  rollupRecordedNonFiatTokenTotals,
} from "@/lib/merchant-balances-rollup";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

function formatUsdVolume(value: string | number | undefined | null): string {
  if (value == null || value === "") return "—";
  const n =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/,/g, ""));
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

type MerchantWalletsCommerceSectionProps = {
  summary: MerchantSummary | null;
  summaryLoading: boolean;
  transactions: TransactionRow[];
  transactionsLoading: boolean;
};

export function MerchantWalletsCommerceSection({
  summary,
  summaryLoading,
  transactions,
  transactionsLoading,
}: MerchantWalletsCommerceSectionProps) {
  const t = summary?.transactions;

  const rollup = useMemo(
    () => rollupRecordedNonFiatTokenTotals(transactions, summary?.periodFrom),
    [transactions, summary?.periodFrom]
  );

  if (summaryLoading && !summary) {
    return (
      <div className="space-y-4" aria-hidden>
        <Skeleton className="h-36 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Commerce volume (reporting window)
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Completed volume (USD)
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {formatUsdVolume(t?.volumeUsdInPeriod)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t?.completedCountInPeriod != null
                ? `${t.completedCountInPeriod} completed in this window`
                : null}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">
              Payment links (USD, completed)
            </p>
            <p className="text-2xl font-semibold tabular-nums">
              {summary?.paymentLinks?.volumeUsdInPeriod != null
                ? formatUsdVolume(summary.paymentLinks.volumeUsdInPeriod)
                : "—"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {summary?.paymentLinks?.completedTxWithLinkCount != null
                ? `${summary.paymentLinks.completedTxWithLinkCount} completed tx with a link`
                : null}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Recorded crypto & on-chain token legs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="space-y-2" role="status" aria-live="polite">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : rollup.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No non-fiat token legs in completed transactions for this period. Fiat checkouts still
              count toward USD volume above.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead scope="col">Chain</TableHead>
                    <TableHead scope="col">Token</TableHead>
                    <TableHead scope="col" className="text-right">
                      Net recorded amount
                    </TableHead>
                    <TableHead scope="col" className="text-right">
                      Legs
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rollup.map((row) => (
                    <TableRow key={`${row.chain}-${row.token}`}>
                      <TableCell className="font-mono text-xs">{row.chain}</TableCell>
                      <TableCell className="font-medium">{row.token}</TableCell>
                      <TableCell className="text-right font-mono text-sm tabular-nums">
                        {formatRollupTokenAmount(row.total, row.token)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        {row.legCount}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

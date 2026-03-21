"use client";

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { useGetMerchantTransactionsQuery } from "@/store/merchant-api";
import type { RootState } from "@/store";
import { Skeleton } from "@/components/ui/skeleton";
import { TransactionsChartClient } from "@/components/transactions/transactions-chart-client";
import { TransactionsDataTable } from "@/components/transactions/transactions-data-table";
import { normalizeTransactionItemToRow } from "@/lib/data-transactions";
import type { TransactionRow } from "@/lib/data-transactions";

/** Aligns with Core `getTransactions` default cap for chart + table parity. */
const MERCHANT_TRANSACTIONS_FETCH_LIMIT = 100;

function MerchantChartsSkeleton() {
  return (
    <div className="font-tertiary text-table grid min-h-[280px] w-full gap-4 md:grid-cols-2">
      <div className="h-[280px] animate-pulse rounded-lg bg-slate-100" />
      <div className="h-[280px] animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export function TransactionsMerchantRtkPanel() {
  const activeBusinessId = useSelector(
    (s: RootState) => s.merchantSession.activeBusinessId
  );

  const params = useMemo(
    () => ({
      page: 1,
      limit: MERCHANT_TRANSACTIONS_FETCH_LIMIT,
    }),
    []
  );

  const { data, isLoading, isError, error, isFetching, refetch } =
    useGetMerchantTransactionsQuery(params, {
      skip: !activeBusinessId,
    });

  const rows: TransactionRow[] = useMemo(() => {
    const items = data?.items ?? [];
    return items
      .map((item) => normalizeTransactionItemToRow(item))
      .filter((r): r is TransactionRow => r !== null);
  }, [data?.items]);

  if (!activeBusinessId) {
    return (
      <section
        className="rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-4 py-12 text-center"
        aria-labelledby="merchant-tx-no-business-title"
      >
        <h2
          id="merchant-tx-no-business-title"
          className="text-sm font-medium text-slate-700"
        >
          No business selected
        </h2>
        <p className="mt-2 text-sm text-muted-foreground" role="status">
          Choose a business in the header to load your sales and charts.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <MerchantChartsSkeleton />
        <div className="space-y-4">
          <Skeleton className="h-10 max-w-md" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    );
  }

  if (isError) {
    const statusCode =
      error && typeof error === "object" && "status" in error
        ? String((error as { status: unknown }).status)
        : "";
    return (
      <section
        className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-8"
        role="alert"
        aria-live="polite"
      >
        <h2 className="text-sm font-medium text-destructive">
          Unable to load transactions
          {statusCode ? ` (${statusCode})` : ""}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Ensure you are signed in with a business selected. You can try again
          with Refresh after fixing the issue.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-8">
      {isFetching && !isLoading ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Updating…
        </p>
      ) : null}
      <TransactionsChartClient transactions={rows} />
      <div className="font-tertiary text-table tabular-nums">
        <TransactionsDataTable
          initialData={rows}
          onRefresh={() => refetch()}
          disableSearchTriggeredRefetch
          hideFailedRetry
        />
      </div>
    </div>
  );
}

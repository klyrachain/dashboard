import { Suspense } from "react";
import { TransactionsDataTable } from "@/components/transactions/transactions-data-table";
import { TransactionsChartClient } from "@/components/transactions/transactions-chart-client";
import { TransactionsPageHeader } from "@/components/transactions/transactions-page-header";
import { UnfulfilledTransactionsView } from "@/components/transactions/unfulfilled-transactions-view";
import { getTransactions } from "@/lib/data-transactions";
import {
  getValidationFailedList,
  getValidationFailedReport,
} from "@/lib/data-validation";
import type { TransactionsView } from "@/components/transactions/transactions-page-header";

type TransactionsPageProps = {
  searchParams: Promise<{ view?: string; page?: string; limit?: string }>;
};

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams;
  const view = (params.view === "unfulfilled" ? "unfulfilled" : "fulfilled") as TransactionsView;
  const isUnfulfilled = view === "unfulfilled";

  const page = isUnfulfilled
    ? Math.max(1, parseInt(params.page ?? "1", 10) || 1)
    : 1;
  const limit = isUnfulfilled
    ? Math.min(100, Math.max(1, parseInt(params.limit ?? "20", 10) || 20))
    : 20;

  const [transactions, validationResult, validationReport] = await Promise.all([
    isUnfulfilled ? [] : getTransactions(),
    isUnfulfilled ? getValidationFailedList({ page, limit }) : { items: [], meta: { page: 1, limit: 20, total: 0 } },
    isUnfulfilled ? getValidationFailedReport({ days: 7 }) : null,
  ]);

  return (
    <div className="space-y-6 font-primary text-body">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Suspense fallback={<h1 className="text-display font-semibold tracking-tight">Transactions</h1>}>
          <TransactionsPageHeader currentView={view} />
        </Suspense>
        {!isUnfulfilled && (
          <p className="font-secondary text-caption text-muted-foreground">
            View and manage all crypto payment transactions.
          </p>
        )}
      </div>

      {isUnfulfilled ? (
        <UnfulfilledTransactionsView
          result={validationResult}
          report={validationReport}
          currentPage={page}
          currentLimit={limit}
        />
      ) : (
        <>
          <TransactionsChartClient transactions={transactions} />
          <div className="font-tertiary text-table tabular-nums">
            <TransactionsDataTable initialData={transactions} />
          </div>
        </>
      )}
    </div>
  );
}

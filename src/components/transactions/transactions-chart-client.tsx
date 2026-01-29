"use client";

import dynamic from "next/dynamic";
import type { TransactionRow } from "@/lib/data-transactions";

const TransactionsTypeChart = dynamic(
  () =>
    import("@/components/transactions/transactions-type-chart").then((m) => ({
      default: m.TransactionsTypeChart,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] animate-pulse rounded-lg bg-slate-100" />
    ),
  }
);

export function TransactionsChartClient({
  transactions,
}: {
  transactions?: TransactionRow[] | null;
}) {
  return (
    <div className="font-tertiary text-table min-h-[280px] w-full">
      <TransactionsTypeChart transactions={transactions ?? undefined} />
    </div>
  );
}

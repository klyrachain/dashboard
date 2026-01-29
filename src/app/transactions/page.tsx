import { TransactionsDataTable } from "@/components/transactions/transactions-data-table";
import { getTransactions } from "@/lib/data-transactions";

export default async function TransactionsPage() {
  const transactions = await getTransactions();
  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Transactions
        </h1>
        <p className="font-secondary text-caption text-muted-foreground">
          View and manage all crypto payment transactions.
        </p>
      </div>
      <div className="font-tertiary text-table tabular-nums">
        <TransactionsDataTable initialData={transactions} />
      </div>
    </div>
  );
}

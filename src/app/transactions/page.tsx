import { TransactionsDataTable } from "@/components/transactions/transactions-data-table";
import { getTransactions } from "@/lib/data-transactions";

export default async function TransactionsPage() {
  const transactions = await getTransactions();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transactions</h1>
        <p className="text-muted-foreground">
          View and manage all crypto payment transactions.
        </p>
      </div>
      <TransactionsDataTable initialData={transactions} />
    </div>
  );
}

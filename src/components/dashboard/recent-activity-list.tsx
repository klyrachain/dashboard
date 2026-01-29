import { getRecentTransactions } from "@/lib/data";
import { Badge } from "@/components/ui/badge";
import { TransactionStatus } from "@/types/enums";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case TransactionStatus.COMPLETED:
      return "success";
    case TransactionStatus.FAILED:
      return "destructive";
    default:
      return "secondary";
  }
}

/**
 * Recent activity — mandatory webhook-fetched data from Core (GET /api/transactions).
 * Updates when Core receives new orders/transactions.
 */
export async function RecentActivityList() {
  const transactions = await getRecentTransactions(5);

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent transactions from Core. Activity will appear here when
        webhooks deliver new orders.
      </p>
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 text-sm"
        >
          <div className="flex items-center gap-4">
            <span className="font-mono text-muted-foreground">
              {tx.id.slice(0, 8)}…
            </span>
            <span className="font-medium">{tx.type}</span>
            <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
          </div>
          <div className="text-muted-foreground">
            {tx.fromAmount} → {tx.toAmount}
          </div>
        </li>
      ))}
    </ul>
  );
}

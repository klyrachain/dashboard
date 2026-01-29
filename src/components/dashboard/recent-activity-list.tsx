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

export async function RecentActivityList() {
  const transactions = await getRecentTransactions(5);

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No recent transactions. Activity will appear here.
      </p>
    );
  }

  return (
    <ul className="space-y-4" role="list">
      {transactions.map((tx) => (
        <li
          key={tx.id}
          className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm"
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

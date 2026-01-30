import { getRecentTransactions } from "@/lib/data";
import { RecentActivityListItem } from "./recent-activity-list-item";

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
        <RecentActivityListItem key={tx.id} tx={tx} />
      ))}
    </ul>
  );
}

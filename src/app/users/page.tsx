import { UsersPageClient } from "@/app/users/users-page-client";
import { getUsers } from "@/lib/data-users";
import { getTransactions } from "@/lib/data-transactions";

export default async function UsersPage() {
  const [users, transactions] = await Promise.all([
    getUsers(),
    getTransactions(),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">
          Search and view customers with their payment history. Export, analyze, and customize columns.
        </p>
      </div>
      <UsersPageClient initialUsers={users} allTransactions={transactions} />
    </div>
  );
}

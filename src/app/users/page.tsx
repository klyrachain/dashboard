import { UsersPageClient } from "@/app/users/users-page-client";
import { getAllPlatformCustomers } from "@/lib/data-users";
import { getTransactions } from "@/lib/data-transactions";

export default async function UsersPage() {
  const [users, transactions] = await Promise.all([
    getAllPlatformCustomers(),
    getTransactions({ limit: 500 }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-muted-foreground">Search, export, and open a row for payment history.</p>
      </div>
      <UsersPageClient initialUsers={users} allTransactions={transactions} />
    </div>
  );
}

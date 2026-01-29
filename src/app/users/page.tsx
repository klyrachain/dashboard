import { UsersPageClient } from "@/app/users/users-page-client";
import { getUsers } from "@/lib/data-users";

export default async function UsersPage() {
  const users = await getUsers();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-muted-foreground">
          Search and view users with their transaction history. Export, analyze, and customize columns.
        </p>
      </div>
      <UsersPageClient initialUsers={users} />
    </div>
  );
}

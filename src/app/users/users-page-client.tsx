"use client";

import * as React from "react";
import { UsersDataTable } from "@/components/users/users-data-table";
import { UserDetailSection } from "@/components/users/user-detail-section";
import type { UserWithTransactions } from "@/lib/data-users";

type UsersPageClientProps = {
  initialUsers: UserWithTransactions[];
};

export function UsersPageClient({ initialUsers }: UsersPageClientProps) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const detailRef = React.useRef<HTMLDivElement>(null);

  const selectedUser = selectedUserId
    ? initialUsers.find((u) => u.id === selectedUserId) ?? null
    : null;

  const handleSelectUser = React.useCallback((user: UserWithTransactions | null) => {
    setSelectedUserId(user?.id ?? null);
  }, []);

  const handleAnalyze = React.useCallback((user: UserWithTransactions) => {
    setSelectedUserId(user.id);
    // Scroll to detail section so user sees overview + transactions
    requestAnimationFrame(() => {
      detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, []);

  return (
    <div className="space-y-8">
      <section>
        <UsersDataTable
          initialData={initialUsers}
          selectedUserId={selectedUserId}
          onSelectUser={handleSelectUser}
          onAnalyze={handleAnalyze}
        />
      </section>

      <section ref={detailRef}>
        <h2 className="mb-4 text-sm font-medium text-slate-500">
          User details & transactions
        </h2>
        <UserDetailSection user={selectedUser} onAnalyze={handleAnalyze} />
      </section>
    </div>
  );
}

"use client";

import * as React from "react";
import { UsersDataTable } from "@/components/users/users-data-table";
import { UserDetailSection } from "@/components/users/user-detail-section";
import type { UserWithTransactions, UserTransactionRow } from "@/lib/data-users";
import { filterTransactionsForUser } from "@/lib/data-transactions";
import type { TransactionRow } from "@/lib/data-transactions";

function transactionRowToUserTx(tx: TransactionRow): UserTransactionRow {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    fromAmount: tx.fromAmount,
    toAmount: tx.toAmount,
    fee: tx.fee ?? null,
    feeInUsd: tx.feeInUsd ?? null,
    createdAt: tx.createdAt,
  };
}

type UsersPageClientProps = {
  initialUsers: UserWithTransactions[];
  allTransactions: TransactionRow[];
};

export function UsersPageClient({ initialUsers, allTransactions }: UsersPageClientProps) {
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const detailRef = React.useRef<HTMLDivElement>(null);

  const selectedUser = selectedUserId
    ? initialUsers.find((u) => u.id === selectedUserId) ?? null
    : null;

  const userTransactions = React.useMemo((): UserTransactionRow[] => {
    if (!selectedUser) return [];
    const filtered = filterTransactionsForUser(allTransactions, {
      email: selectedUser.email,
      address: selectedUser.address,
    });
    return filtered.map(transactionRowToUserTx);
  }, [selectedUser, allTransactions]);

  const handleSelectUser = React.useCallback((user: UserWithTransactions | null) => {
    setSelectedUserId(user?.id ?? null);
  }, []);

  const handleAnalyze = React.useCallback((user: UserWithTransactions) => {
    setSelectedUserId(user.id);
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
        <UserDetailSection
          user={selectedUser}
          transactions={userTransactions}
          onAnalyze={handleAnalyze}
        />
      </section>
    </div>
  );
}

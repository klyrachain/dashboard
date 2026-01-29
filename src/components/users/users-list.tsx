"use client";

import * as React from "react";
import { Search, ChevronDown, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { UserWithTransactions } from "@/lib/data-users";

export function UsersList({
  initialUsers,
}: {
  initialUsers: UserWithTransactions[];
}) {
  const [search, setSearch] = React.useState("");
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const filtered = React.useMemo(() => {
    if (!search.trim()) return initialUsers;
    const q = search.toLowerCase();
    return initialUsers.filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.address?.toLowerCase().includes(q) ||
        u.id.toLowerCase().includes(q)
    );
  }, [initialUsers, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, address, or ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <ul className="space-y-2">
        {filtered.map((user) => {
          const isExpanded = expandedId === user.id;
          return (
            <li key={user.id}>
              <Card>
                <CardContent className="p-0">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : user.id)
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none rounded-t-lg"
                  >
                    <div className="flex items-center gap-3">
                      {isExpanded ? (
                        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="font-mono text-sm text-muted-foreground">
                        {user.id.slice(0, 8)}…
                      </span>
                      <span className="font-medium">
                        {user.email ?? user.address ?? "—"}
                      </span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {user.transactions.length} transaction(s)
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3">
                      <p className="mb-2 text-sm font-medium text-muted-foreground">
                        Transaction History
                      </p>
                      {user.transactions.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No transactions yet.
                        </p>
                      ) : (
                        <ul className="space-y-2">
                          {user.transactions.map((tx) => (
                            <li
                              key={tx.id}
                              className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                            >
                              <span className="font-mono text-muted-foreground">
                                {tx.id.slice(0, 8)}…
                              </span>
                              <span>{tx.type}</span>
                              <Badge
                                variant={
                                  tx.status === "COMPLETED"
                                    ? "success"
                                    : tx.status === "FAILED"
                                      ? "destructive"
                                      : "secondary"
                                }
                              >
                                {tx.status}
                              </Badge>
                              <span className="text-muted-foreground">
                                {tx.fromAmount} → {tx.toAmount}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground">
          No users match your search.
        </p>
      )}
    </div>
  );
}

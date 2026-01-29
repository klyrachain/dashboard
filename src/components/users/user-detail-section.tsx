"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { UserWithTransactions, UserTransactionRow } from "@/lib/data-users";
import { format } from "date-fns";
import { User, FileText, Activity } from "lucide-react";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "COMPLETED":
      return "success";
    case "FAILED":
      return "destructive";
    case "PENDING":
    case "ACTIVE":
      return "secondary";
    default:
      return "outline";
  }
}

function TransactionRow({ tx }: { tx: UserTransactionRow }) {
  return (
    <TableRow>
      <TableCell className="font-mono text-muted-foreground text-xs">
        {tx.id.slice(0, 8)}…
      </TableCell>
      <TableCell>{tx.type}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
      </TableCell>
      <TableCell className="tabular-nums">{tx.fromAmount}</TableCell>
      <TableCell className="tabular-nums">{tx.toAmount}</TableCell>
      <TableCell className="text-muted-foreground text-sm">
        {tx.createdAt instanceof Date
          ? format(tx.createdAt, "MMM d, yyyy HH:mm")
          : String(tx.createdAt)}
      </TableCell>
    </TableRow>
  );
}

export type UserDetailSectionProps = {
  user: UserWithTransactions | null;
  onAnalyze?: (user: UserWithTransactions) => void;
};

export function UserDetailSection({ user, onAnalyze }: UserDetailSectionProps) {
  if (!user) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
            <User className="size-6 text-slate-400" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">No user selected</p>
            <p className="text-xs text-slate-500">
              Select a row in the table above to view transactions, overview, and details.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const txs = user.transactions;
  const completed = txs.filter((t) => t.status === "COMPLETED").length;
  const failed = txs.filter((t) => t.status === "FAILED").length;
  const pending = txs.filter((t) => t.status === "PENDING" || t.status === "ACTIVE").length;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">Overview</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">
                Total transactions
              </span>
              <Activity className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums">{txs.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">Completed</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-emerald-600">{completed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">Failed</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-red-600">{failed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <span className="text-sm font-medium text-muted-foreground">Pending / Active</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold tabular-nums text-amber-600">{pending}</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* User details */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">Details</h2>
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">ID</dt>
                <dd className="mt-1 font-mono text-sm break-all" title={user.id}>
                  {user.id}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</dt>
                <dd className="mt-1 text-sm truncate max-w-[240px]" title={user.email ?? undefined}>
                  {user.email ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Address</dt>
                <dd className="mt-1 font-mono text-sm truncate max-w-[280px]" title={user.address ?? undefined}>
                  {user.address ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Created</dt>
                <dd className="mt-1 text-sm text-muted-foreground">
                  {user.createdAt instanceof Date
                    ? format(user.createdAt, "PPpp")
                    : String(user.createdAt)}
                </dd>
              </div>
            </dl>
            {onAnalyze && (
              <div className="mt-4 pt-4">
                <button
                  type="button"
                  onClick={() => onAnalyze(user)}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  View analytics →
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* User transactions */}
      <section>
        <h2 className="mb-4 text-sm font-medium text-slate-500">Transactions</h2>
        <Card>
          {txs.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <FileText className="size-10 text-slate-300" aria-hidden />
              <div>
                <p className="text-sm font-medium text-slate-600">No transactions yet</p>
                <p className="text-xs text-slate-500">
                  Transactions for this user will appear here when synced from Core.
                </p>
              </div>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>From amount</TableHead>
                    <TableHead>To amount</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {txs.map((tx) => (
                    <TransactionRow key={tx.id} tx={tx} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

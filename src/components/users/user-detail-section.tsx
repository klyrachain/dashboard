"use client";

import * as React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { User, FileText, Activity, ChevronLeft, ChevronRight } from "lucide-react";

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const DEFAULT_PAGE_SIZE = 10;

function DetailRowWithCopy({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="mt-1 flex items-center gap-2">
        <span className={className} title={value || undefined}>
          {value || "—"}
        </span>
        <CopyButton value={value} label={`Copy ${label}`} hideWhenEmpty />
      </dd>
    </div>
  );
}

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
        <div className="flex items-center gap-2">
          <span>{tx.id.slice(0, 8)}…</span>
          <CopyButton value={tx.id} label="Copy transaction ID" />
        </div>
      </TableCell>
      <TableCell>{tx.type}</TableCell>
      <TableCell>
        <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
      </TableCell>
      <TableCell className="tabular-nums">{tx.fromAmount}</TableCell>
      <TableCell className="tabular-nums">{tx.toAmount}</TableCell>
      <TableCell className="tabular-nums text-muted-foreground text-sm">
        {tx.fee != null && tx.fee !== "" ? tx.fee : "—"}
      </TableCell>
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
  /** Transactions involving this user (fromIdentifier/toIdentifier matching user email or address). */
  transactions: UserTransactionRow[];
  onAnalyze?: (user: UserWithTransactions) => void;
};

export function UserDetailSection({ user, transactions: userTransactions, onAnalyze }: UserDetailSectionProps) {
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(DEFAULT_PAGE_SIZE);

  // Reset to first page when user or transaction list changes
  React.useEffect(() => {
    setPage(1);
  }, [user?.id, userTransactions.length]);

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

  const txs = userTransactions;
  const totalCount = txs.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (page - 1) * pageSize;
  const paginatedTxs = txs.slice(startIndex, startIndex + pageSize);
  const from = totalCount === 0 ? 0 : startIndex + 1;
  const to = Math.min(startIndex + pageSize, totalCount);

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
              <DetailRowWithCopy
                label="ID"
                value={user.id}
                className="min-w-0 flex-1 font-mono text-sm break-all"
              />
              <DetailRowWithCopy
                label="Email"
                value={user.email ?? ""}
                className="min-w-0 flex-1 truncate text-sm max-w-[240px]"
              />
              <DetailRowWithCopy
                label="Address"
                value={user.address ?? ""}
                className="min-w-0 flex-1 font-mono text-sm truncate max-w-[280px]"
              />
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
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">ID</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>From amount</TableHead>
                      <TableHead>To amount</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedTxs.map((tx) => (
                      <TransactionRow key={tx.id} tx={tx} />
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-4 py-3">
                <div className="flex items-center gap-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {from}–{to} of {totalCount}
                  </p>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => {
                      setPageSize(Number(v));
                      setPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[72px]" aria-label="Rows per page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">per page</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <span className="min-w-[100px] text-center text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}

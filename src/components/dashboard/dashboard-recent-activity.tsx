"use client";

import { useMemo, useState } from "react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { Activity } from "lucide-react";
import { TransactionStatus } from "@/types/enums";
import type { RecentTransaction } from "@/lib/data";

const TYPE_FILTER_ALL = "all";
const STATUS_FILTER_ALL = "all";

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

function formatCreated(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(d);
}

interface DashboardRecentActivityProps {
  transactions: RecentTransaction[];
}

function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">No activity yet</p>
        <p className="text-xs text-slate-500">
          Recent transactions, fees, and payouts will appear here when webhooks
          deliver new orders or data is available from poll.
        </p>
      </div>
    </div>
  );
}

export function DashboardRecentActivity({
  transactions,
}: DashboardRecentActivityProps) {
  const [typeFilter, setTypeFilter] = useState<string>(TYPE_FILTER_ALL);
  const [statusFilter, setStatusFilter] = useState<string>(STATUS_FILTER_ALL);

  const types = useMemo(() => {
    const set = new Set(transactions.map((t) => t.type).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  const statuses = useMemo(() => {
    const set = new Set(transactions.map((t) => t.status).filter(Boolean));
    return Array.from(set).sort();
  }, [transactions]);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchType =
        typeFilter === TYPE_FILTER_ALL || t.type === typeFilter;
      const matchStatus =
        statusFilter === STATUS_FILTER_ALL || t.status === statusFilter;
      return matchType && matchStatus;
    });
  }, [transactions, typeFilter, statusFilter]);

  const hasData = filtered.length > 0;

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2 sm:justify-start">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-medium text-slate-900">
              Recent Activity
            </h3>
          </div>
          <Badge
            variant="secondary"
            className="font-normal text-slate-500 sm:ml-0"
          >
            Webhook data · Last 5
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={typeFilter}
            onValueChange={setTypeFilter}
            aria-label="Filter by type"
          >
            <SelectTrigger className="h-8 w-full bg-slate-50 text-sm sm:w-[130px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={TYPE_FILTER_ALL}>All types</SelectItem>
              {types.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={setStatusFilter}
            aria-label="Filter by status"
          >
            <SelectTrigger className="h-8 w-full bg-slate-50 text-sm sm:w-[130px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
              {statuses.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {hasData ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-600">ID</TableHead>
                <TableHead className="text-slate-600">Type</TableHead>
                <TableHead className="text-slate-600">Status</TableHead>
                <TableHead className="text-slate-600">Amount</TableHead>
                <TableHead className="text-slate-600">Fee</TableHead>
                <TableHead className="text-slate-600">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell className="font-mono text-slate-700">
                    <div className="flex items-center gap-2">
                      <span>{tx.id.slice(0, 8)}…</span>
                      <CopyButton value={tx.id} label="Copy transaction ID" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium text-slate-900">
                    {tx.type}
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusVariant(tx.status)}>
                      {tx.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-slate-700">
                    {tx.fromAmount} → {tx.toAmount}
                  </TableCell>
                  <TableCell className="tabular-nums text-xs text-slate-600">
                    {tx.feeInUsd != null && tx.feeInUsd !== ""
                      ? `$${Number(tx.feeInUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      : tx.fee != null && tx.fee !== ""
                        ? tx.fee
                        : "—"}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatCreated(tx.createdAt)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="px-6 pb-6">
            <EmptyActivityState />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

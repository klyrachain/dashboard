"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/data-balances";
import type {
  ConnectMerchantListItem,
  ConnectMerchantDetail,
} from "@/lib/data-connect";
import { getConnectMerchantByIdAction } from "@/app/connect/actions";

const KYB_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "RESTRICTED", label: "Restricted" },
];

const RISK_OPTIONS = [
  { value: "all", label: "All risk" },
  { value: "high", label: "High" },
  { value: "low", label: "Low" },
];

function feeTierLabel(tier: { percentage?: number; flat?: number; max?: number }): string {
  if (!tier) return "—";
  const parts: string[] = [];
  if (typeof tier.percentage === "number") parts.push(`${tier.percentage}%`);
  if (typeof tier.flat === "number" && tier.flat > 0) parts.push(`$${tier.flat} flat`);
  if (typeof tier.max === "number") parts.push(`max $${tier.max}`);
  return parts.length ? parts.join(", ") : "—";
}

function getKybVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "APPROVED":
      return "success";
    case "REJECTED":
    case "RESTRICTED":
      return "destructive";
    case "PENDING":
      return "secondary";
    default:
      return "outline";
  }
}

type ConnectMerchantsClientProps = {
  initialItems: ConnectMerchantListItem[];
  meta: { page: number; limit: number; total: number };
  statusFilter?: string;
  riskLevelFilter?: string;
};

export function ConnectMerchantsClient({
  initialItems,
  meta,
  statusFilter,
  riskLevelFilter,
}: ConnectMerchantsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<ConnectMerchantDetail | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const handleRowClick = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetail(null);
    try {
      const result = await getConnectMerchantByIdAction(id);
      if (result.ok && result.data) setDetail(result.data);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleStatusChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") next.set("status", value);
    else next.delete("status");
    next.delete("page");
    router.push(`/connect/merchants?${next.toString()}`);
  };

  const handleRiskChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") next.set("riskLevel", value);
    else next.delete("riskLevel");
    next.delete("page");
    router.push(`/connect/merchants?${next.toString()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="KYB status" />
          </SelectTrigger>
          <SelectContent>
            {KYB_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={riskLevelFilter ?? "all"}
          onValueChange={handleRiskChange}
        >
          <SelectTrigger className="w-[120px]">
            <SelectValue placeholder="Risk" />
          </SelectTrigger>
          <SelectContent>
            {RISK_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Merchant</TableHead>
              <TableHead>Account ID</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead>Fee Tier</TableHead>
              <TableHead>KYB Status</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-muted/60"
                onClick={() => handleRowClick(row.id)}
              >
                <TableCell className="font-medium text-slate-900">{row.name}</TableCell>
                <TableCell className="font-mono text-slate-600">{row.accountId}</TableCell>
                <TableCell className="tabular-nums">{formatCurrency(row.balance)}</TableCell>
                <TableCell className="text-slate-600">{feeTierLabel(row.feeTier)}</TableCell>
                <TableCell>
                  <Badge variant={getKybVariant(row.kybStatus)}>{row.kybStatus || "—"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {row.createdAt ? format(new Date(row.createdAt), "MMM d, yyyy") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {meta.total === 0 && (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <p className="text-sm font-medium text-slate-500">No merchants</p>
            <p className="text-xs text-slate-400">Partners will appear here when onboarded.</p>
          </div>
        )}
      </div>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{detail?.name ?? "Merchant detail"}</DialogTitle>
          </DialogHeader>
          {detailLoading && (
            <p className="text-sm text-slate-500">Loading…</p>
          )}
          {!detailLoading && detail && (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-slate-500">Account ID</p>
                <p className="font-mono font-medium">{detail.accountId}</p>
              </div>
              {detail.webhookUrl && (
                <div>
                  <p className="text-slate-500">Webhook URL</p>
                  <p className="font-mono text-xs break-all">{detail.webhookUrl}</p>
                </div>
              )}
              <div className="flex gap-4">
                <div>
                  <p className="text-slate-500">Transactions</p>
                  <p className="font-medium">{detail.transactionCount}</p>
                </div>
                <div>
                  <p className="text-slate-500">Volume (30d)</p>
                  <p className="font-medium">{formatCurrency(detail.volume30d)}</p>
                </div>
              </div>
              {detail.apiKeys.length > 0 && (
                <div>
                  <p className="text-slate-500 mb-2">API Keys</p>
                  <ul className="space-y-1">
                    {detail.apiKeys.map((k) => (
                      <li key={k.id} className="flex items-center justify-between rounded border border-slate-100 px-2 py-1">
                        <span className="font-mono text-xs">{k.keyPrefix}…</span>
                        <span className="text-xs text-slate-500">{k.name}</span>
                        {k.isActive ? (
                          <Badge variant="success" className="text-xs">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

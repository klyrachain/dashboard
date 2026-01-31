"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/data-balances";
import type {
  ConnectSettlementListItem,
  ConnectSettlementDetail,
} from "@/lib/data-connect";
import { getConnectSettlementByIdAction } from "@/app/connect/actions";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
];

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "PAID":
      return "success";
    case "FAILED":
    case "REVERSED":
      return "destructive";
    case "PROCESSING":
      return "secondary";
    default:
      return "outline";
  }
}

function batchShortId(batchId: string): string {
  if (!batchId) return "—";
  return batchId.length > 8 ? batchId.slice(-8) : batchId;
}

type ConnectSettlementsClientProps = {
  initialItems: ConnectSettlementListItem[];
  meta: { page: number; limit: number; total: number };
  statusFilter?: string;
  selectedId?: string;
};

export function ConnectSettlementsClient({
  initialItems,
  meta,
  statusFilter,
  selectedId,
}: ConnectSettlementsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [detail, setDetail] = useState<ConnectSettlementDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetail(null);
    getConnectSettlementByIdAction(selectedId).then((result) => {
      if (cancelled) return;
      setDetailLoading(false);
      if (result.ok && result.data) setDetail(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const handleSelectBatch = (id: string) => {
    const next = new URLSearchParams(searchParams.toString());
    next.set("id", id);
    router.push(`/connect/settlements?${next.toString()}`);
  };

  const handleStatusChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") next.set("status", value);
    else next.delete("status");
    next.delete("page");
    next.delete("id");
    router.push(`/connect/settlements?${next.toString()}`);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter ?? "all"}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: list of batches */}
        <div className="space-y-4 lg:col-span-1">
          <div className="space-y-2">
            {initialItems.map((item) => (
              <Card
                key={item.id}
                className={`cursor-pointer transition-colors ${selectedId === item.id ? "ring-2 ring-primary" : "hover:bg-slate-50"}`}
                onClick={() => handleSelectBatch(item.id)}
              >
                <CardHeader className="pb-2">
                  <p className="font-mono text-sm font-medium text-slate-900">
                    Batch #{batchShortId(item.batchId)}
                  </p>
                  <p className="text-xs text-slate-500">To: {item.businessName}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <p className="text-sm font-semibold tabular-nums text-slate-900">
                    {formatCurrency(item.amount)} {item.currency}
                  </p>
                  <Badge variant={getStatusVariant(item.status)} className="mt-1">
                    {item.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
          {meta.total === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-8 text-center">
              <p className="text-sm font-medium text-slate-500">No settlements</p>
              <p className="text-xs text-slate-400">Payout batches will appear here.</p>
            </div>
          )}
        </div>
        {/* Right: batch detail */}
        <div className="lg:col-span-2">
          {!selectedId && (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
              <p className="text-sm font-medium text-slate-500">Select a batch</p>
              <p className="text-xs text-slate-400">Click a batch to see details.</p>
            </div>
          )}
          {selectedId && detailLoading && (
            <div className="rounded-lg border border-slate-200 bg-white p-6">
              <p className="text-sm text-slate-500">Loading…</p>
            </div>
          )}
          {selectedId && !detailLoading && detail && (
            <Card className="bg-white">
              <CardHeader>
                <p className="font-mono text-sm font-medium text-slate-700">
                  Batch #{batchShortId(detail.batchId)}
                </p>
                <p className="text-xs text-slate-500">To: {detail.businessName}</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border border-slate-200 bg-slate-50/50 p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Gross</span>
                    <span className="font-medium tabular-nums">{formatCurrency(detail.gross)} {detail.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Fee</span>
                    <span className="font-medium tabular-nums">−{formatCurrency(detail.fee)} {detail.currency}</span>
                  </div>
                  <div className="flex justify-between text-sm font-semibold border-t border-slate-200 pt-2">
                    <span>Net Payout</span>
                    <span className="tabular-nums">{formatCurrency(detail.amount)} {detail.currency}</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Status</p>
                  <Badge variant={getStatusVariant(detail.status)}>{detail.status}</Badge>
                  {detail.reference && (
                    <p className="text-xs text-slate-500 mt-1">Ref: {detail.reference}</p>
                  )}
                </div>
                {detail.timeline.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Timeline</p>
                    <ul className="space-y-2">
                      {detail.timeline.map((step, i) => (
                        <li
                          key={i}
                          className={`flex items-center gap-2 text-sm ${step.done ? "text-slate-700" : "text-slate-400"}`}
                        >
                          <span className={step.done ? "text-green-600" : "text-slate-300"}>
                            {step.done ? "✓" : "○"}
                          </span>
                          <span>{step.step}</span>
                          {step.at && (
                            <span className="text-xs text-slate-400">
                              {format(new Date(step.at), "MMM d, HH:mm")}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.sourceTransactions && detail.sourceTransactions.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-2">Source Transactions</p>
                    <p className="text-xs text-slate-500">Reserved for future use.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

    </div>
  );
}

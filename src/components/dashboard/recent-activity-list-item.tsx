"use client";

import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import { TransactionStatus } from "@/types/enums";
import type { RecentTransaction } from "@/lib/data";

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

export function RecentActivityListItem({ tx }: { tx: RecentTransaction }) {
  return (
    <li className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3 text-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground">
            {tx.id.slice(0, 8)}…
          </span>
          <CopyButton value={tx.id} label="Copy transaction ID" />
        </div>
        <span className="font-medium">{tx.type}</span>
        <Badge variant={getStatusVariant(tx.status)}>{tx.status}</Badge>
      </div>
      <div className="flex items-center gap-3 text-muted-foreground">
        <span>{tx.fromAmount} → {tx.toAmount}</span>
        {tx.fee != null && tx.fee !== "" && (
          <span className="tabular-nums text-slate-600">Fee: {tx.fee}</span>
        )}
      </div>
    </li>
  );
}

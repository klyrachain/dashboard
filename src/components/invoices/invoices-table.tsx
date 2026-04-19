"use client";

import { useRouter } from "next/navigation";
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
import type { InvoiceListItem } from "@/lib/data-invoices";
import { formatInvoiceCurrency } from "@/lib/data-invoices";

type InvoicesTableProps = {
  data: InvoiceListItem[];
  meta?: { page: number; limit: number; total: number };
  /** Current status filter from URL (for display only). */
  statusFilter?: string;
};

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "Paid":
      return "success";
    case "Overdue":
    case "Cancelled":
      return "destructive";
    case "Pending":
    case "Draft":
    default:
      return "secondary";
  }
}

export function InvoicesTable({ data, meta, statusFilter }: InvoicesTableProps) {
  const router = useRouter();
  const totalLabel =
    meta != null ? `${meta.total} invoice${meta.total === 1 ? "" : "s"}` : null;
  const filterLabel =
    statusFilter && statusFilter !== "all" ? `Status: ${statusFilter}` : null;

  return (
    <div className="space-y-2">
      {(totalLabel || filterLabel) ? (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {[filterLabel, totalLabel].filter(Boolean).join(" · ")}
        </p>
      ) : null}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Invoice No.</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Issued</TableHead>
          <TableHead>Due date</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow
            key={row.id}
            className="cursor-pointer hover:bg-muted/60"
            onClick={() => router.push(`/invoices/${row.id}`)}
          >
            <TableCell className="font-mono font-medium">
              {row.invoiceNumber}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.customer}
            </TableCell>
            <TableCell className="tabular-nums">
              {formatInvoiceCurrency(row.amount, row.currency)} {row.currency}
            </TableCell>
            <TableCell>
              <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(row.issued), "MMM d, yyyy")}
            </TableCell>
            <TableCell className="text-muted-foreground">
              {format(new Date(row.dueDate), "MMM d, yyyy")}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
  );
}

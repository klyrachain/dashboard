"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ChevronRight, Download, Send, Pencil, MoreHorizontal, FileText } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
import type { SerializedInvoice } from "@/lib/data-invoices";
import { formatInvoiceCurrency } from "@/lib/data-invoices";
import { exportInvoiceToCsv } from "@/lib/export-invoice-csv";
import { markInvoicePaidAction, cancelInvoiceAction, duplicateInvoiceAction } from "@/app/invoices/actions";
import {
  cancelInvoiceViaMerchantProxy,
  duplicateInvoiceViaMerchantProxy,
  hasMerchantInvoicesAuth,
  markInvoicePaidViaMerchantProxy,
} from "@/lib/merchant-invoices-proxy-client";
import { SendInvoiceModal } from "./send-invoice-modal";
import { EditInvoiceModal } from "./edit-invoice-modal";
import { EditNotesModal } from "./edit-notes-modal";

type InvoiceDetailViewProps = {
  invoice: SerializedInvoice;
  /**
   * After PATCH / send / status changes, refetch client-held invoice (merchant detail).
   * Always combined with `router.refresh()` for server-backed UI and lists.
   */
  onInvoiceDataUpdated?: () => void | Promise<void>;
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

export function InvoiceDetailView({
  invoice,
  onInvoiceDataUpdated,
}: InvoiceDetailViewProps) {
  const router = useRouter();
  const issued = new Date(invoice.issued);
  const dueDate = new Date(invoice.dueDate);
  const paidAt = invoice.paidAt ? new Date(invoice.paidAt) : null;

  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editNotesOpen, setEditNotesOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = () => {
    void (async () => {
      await onInvoiceDataUpdated?.();
      router.refresh();
    })();
  };

  const handleExport = () => exportInvoiceToCsv(invoice);

  const handleMarkAsPaid = async () => {
    setActionError(null);
    setPendingAction("paid");
    if (hasMerchantInvoicesAuth()) {
      const result = await markInvoicePaidViaMerchantProxy(invoice.id);
      setPendingAction(null);
      if (result.success) refresh();
      else setActionError(result.error);
      return;
    }
    const result = await markInvoicePaidAction(invoice.id);
    setPendingAction(null);
    if (result.success) refresh();
    else setActionError(result.error ?? "Failed to mark as paid");
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this invoice? This cannot be undone.")) return;
    setActionError(null);
    setPendingAction("cancel");
    if (hasMerchantInvoicesAuth()) {
      const result = await cancelInvoiceViaMerchantProxy(invoice.id);
      setPendingAction(null);
      if (result.success) refresh();
      else setActionError(result.error);
      return;
    }
    const result = await cancelInvoiceAction(invoice.id);
    setPendingAction(null);
    if (result.success) refresh();
    else setActionError(result.error ?? "Failed to cancel");
  };

  const handleDuplicate = async () => {
    setActionError(null);
    setPendingAction("duplicate");
    try {
      if (hasMerchantInvoicesAuth()) {
        const dup = await duplicateInvoiceViaMerchantProxy(invoice.id);
        if (dup.success) {
          router.push(`/invoices/${dup.id}`);
          router.refresh();
        } else {
          setActionError(dup.error);
        }
        return;
      }
      const dup = await duplicateInvoiceAction(invoice.id);
      if (dup.success === false) {
        setActionError(dup.error ?? "Failed to duplicate invoice");
      }
    } catch {
      /* duplicateInvoiceAction redirect() */
    } finally {
      setPendingAction(null);
    }
  };

  const canEdit = invoice.status !== "Paid" && invoice.status !== "Cancelled";
  const canMarkPaid = invoice.status === "Pending" || invoice.status === "Overdue" || invoice.status === "Draft";
  const canCancel = invoice.status !== "Paid" && invoice.status !== "Cancelled";

  return (
    <div className="space-y-6 font-primary text-body">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/invoices" className="hover:text-foreground">
          Invoice List
        </Link>
        <ChevronRight className="size-4" aria-hidden />
        <span className="text-foreground">Invoice details</span>
      </nav>

      {actionError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          {actionError}
        </p>
      ) : null}

      {/* Header: number, status, amount + paid at, actions */}
      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold tracking-tight">
              {invoice.invoiceNumber}
            </h1>
            <Badge variant={getStatusVariant(invoice.status)}>
              {invoice.status}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatInvoiceCurrency(invoice.amount, invoice.currency)} {invoice.currency}
            {paidAt && (
              <span className="ml-1">
                Paid at {format(paidAt, "d MMM yyyy")}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSendModalOpen(true)}
            disabled={invoice.status === "Cancelled"}
          >
            <Send className="size-4" aria-hidden />
            Send Invoice
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditModalOpen(true)}
            disabled={!canEdit}
          >
            <Pencil className="size-4" aria-hidden />
            Edit Invoice
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={!!pendingAction}>
                <MoreHorizontal className="size-4" aria-hidden />
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={handleDuplicate}
                disabled={!!pendingAction}
              >
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleMarkAsPaid}
                disabled={!canMarkPaid || !!pendingAction}
              >
                Mark as paid
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleCancel}
                disabled={!canCancel || !!pendingAction}
              >
                Cancel invoice
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Two columns */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left: Invoice details */}
        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <h2 className="text-base font-semibold">{invoice.batchTitle}</h2>
            </CardHeader>
            <CardContent className="space-y-6">
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Billed to
                  </dt>
                  <dd className="mt-0.5">{invoice.billedTo}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Billing details
                  </dt>
                  <dd className="mt-0.5">{invoice.billingDetails}</dd>
                </div>
              </dl>

              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Invoice Number
                  </dt>
                  <dd className="mt-0.5 font-mono">{invoice.invoiceNumber}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Subject
                  </dt>
                  <dd className="mt-0.5">{invoice.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Currency
                  </dt>
                  <dd className="mt-0.5">
                    {invoice.currencyLabel ?? invoice.currency}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Issued
                  </dt>
                  <dd className="mt-0.5">{format(issued, "d MMMM yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Due date
                  </dt>
                  <dd className="mt-0.5">{format(dueDate, "d MMMM yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">
                    Notes
                  </dt>
                  <dd className="mt-0.5">{invoice.notes ?? "—"}</dd>
                </div>
              </dl>

              {/* Products table */}
              <div>
                <h3 className="mb-3 text-sm font-medium">Products</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="w-20 text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit price</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lineItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          {item.productName}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {item.qty}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInvoiceCurrency(item.unitPrice, invoice.currency)}{" "}
                          {invoice.currency}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatInvoiceCurrency(item.amount, invoice.currency)}{" "}
                          {invoice.currency}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Summary */}
              <div className="space-y-2 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="tabular-nums">
                    {formatInvoiceCurrency(invoice.subtotal, invoice.currency)}{" "}
                    {invoice.currency}
                  </span>
                </div>
                {invoice.discountPercent > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Discount ({invoice.discountPercent}%)
                    </span>
                    <span className="tabular-nums">
                      {formatInvoiceCurrency(invoice.discountAmount, invoice.currency)}{" "}
                      {invoice.currency}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-medium">
                  <span>Total</span>
                  <span className="tabular-nums">
                    {formatInvoiceCurrency(invoice.total, invoice.currency)}{" "}
                    {invoice.currency}
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Amount due</span>
                  <span className="tabular-nums">
                    {formatInvoiceCurrency(invoice.amountDue, invoice.currency)}{" "}
                    {invoice.currency}
                  </span>
                </div>
              </div>

              {/* Terms & Condition */}
              <div>
                <h3 className="mb-2 text-sm font-medium">Terms & Condition</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {invoice.termsAndConditions}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Notes & Log */}
        <div className="space-y-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <h2 className="text-base font-semibold">Notes</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditNotesOpen(true)}
              >
                <Pencil className="size-4" aria-hidden />
                Edit Notes
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {invoice.notesContent || "—"}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-white">
            <CardHeader className="pb-2">
              <h2 className="text-base font-semibold">Log</h2>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {invoice.log
                  .slice()
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() - new Date(a.date).getTime()
                  )
                  .map((entry) => (
                    <li
                      key={entry.id}
                      className="flex gap-3 text-sm"
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <div>
                        <p className="text-foreground">{entry.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.date), "d MMM yyyy, hh:mm a")}
                        </p>
                      </div>
                    </li>
                  ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <SendInvoiceModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
        invoiceId={invoice.id}
        initialEmail={invoice.billedTo}
        onSuccess={refresh}
      />
      <EditInvoiceModal
        invoice={invoice}
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        onSuccess={refresh}
      />
      <EditNotesModal
        invoiceId={invoice.id}
        notesContent={invoice.notesContent}
        open={editNotesOpen}
        onOpenChange={setEditNotesOpen}
        onSuccess={refresh}
      />
    </div>
  );
}

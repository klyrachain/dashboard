/**
 * Client-side export of invoice to CSV for download.
 */

import type { SerializedInvoice } from "@/lib/data-invoices";
import { formatInvoiceCurrency } from "@/lib/data-invoices";
import { format } from "date-fns";

function escapeCsvCell(s: string): string {
  const t = String(s).replace(/"/g, '""');
  return t.includes(",") || t.includes("\n") || t.includes('"') ? `"${t}"` : t;
}

export function exportInvoiceToCsv(invoice: SerializedInvoice): void {
  const rows: string[][] = [
    ["Invoice", invoice.invoiceNumber],
    ["Status", invoice.status],
    ["Amount", `${formatInvoiceCurrency(invoice.amount, invoice.currency)} ${invoice.currency}`],
    ["Billed to", invoice.billedTo],
    ["Billing details", invoice.billingDetails],
    ["Subject", invoice.subject],
    ["Issued", format(new Date(invoice.issued), "yyyy-MM-dd")],
    ["Due date", format(new Date(invoice.dueDate), "yyyy-MM-dd")],
    [],
    ["Product", "Qty", "Unit price", "Amount"],
    ...invoice.lineItems.map((li) => [
      li.productName,
      String(li.qty),
      `${formatInvoiceCurrency(li.unitPrice, invoice.currency)} ${invoice.currency}`,
      `${formatInvoiceCurrency(li.amount, invoice.currency)} ${invoice.currency}`,
    ]),
    [],
    ["Subtotal", "", "", `${formatInvoiceCurrency(invoice.subtotal, invoice.currency)} ${invoice.currency}`],
    ["Total", "", "", `${formatInvoiceCurrency(invoice.total, invoice.currency)} ${invoice.currency}`],
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `invoice-${invoice.invoiceNumber}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

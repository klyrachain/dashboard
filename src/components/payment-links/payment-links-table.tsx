"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PaymentLinkDetailModal } from "./payment-link-detail-modal";
import type { PaymentLinkRow } from "@/lib/data-payment-links";

type PaymentLinksTableProps = {
  data: PaymentLinkRow[];
};

export function PaymentLinksTable({ data }: PaymentLinksTableProps) {
  const [selected, setSelected] = useState<PaymentLinkRow | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const openDetail = (row: PaymentLinkRow) => {
    setSelected(row);
    setModalOpen(true);
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Amount</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead>Invoice No.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.id}
              className="cursor-pointer hover:bg-muted/60"
              onClick={() => openDetail(row)}
            >
              <TableCell className="font-medium tabular-nums">
                {row.currency} {row.amount}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {row.customer}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {format(new Date(row.requested), "MMM d, yyyy")}
              </TableCell>
              <TableCell className="text-muted-foreground font-mono">
                {row.invoiceNo ?? "—"}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <PaymentLinkDetailModal
        request={selected}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </>
  );
}

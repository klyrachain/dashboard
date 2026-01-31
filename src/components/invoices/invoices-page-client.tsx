"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { SendInvoiceModal } from "./send-invoice-modal";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "Draft", label: "Draft" },
  { value: "Pending", label: "Pending" },
  { value: "Overdue", label: "Overdue" },
  { value: "Paid", label: "Paid" },
  { value: "Cancelled", label: "Cancelled" },
];

type InvoicesPageClientProps = {
  statusFilter?: string;
};

export function InvoicesPageClient({ statusFilter }: InvoicesPageClientProps) {
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleStatusChange = (value: string) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value && value !== "all") next.set("status", value);
    else next.delete("status");
    next.delete("page");
    router.push(`/invoices?${next.toString()}`);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
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
      <Button onClick={() => setSendModalOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Create invoice
      </Button>
      <SendInvoiceModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
      />
    </div>
  );
}

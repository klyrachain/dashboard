"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { SendInvoiceModal } from "./send-invoice-modal";

export function InvoicesPageClient() {
  const [sendModalOpen, setSendModalOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setSendModalOpen(true)}>
        <Plus className="size-4" aria-hidden />
        Send invoice
      </Button>
      <SendInvoiceModal
        open={sendModalOpen}
        onOpenChange={setSendModalOpen}
      />
    </>
  );
}

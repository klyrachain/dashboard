import type { Metadata } from "next";
import { CreateInvoicePageClient } from "@/components/invoices/create-invoice-page-client";

export const metadata: Metadata = {
  title: "New invoice",
};

export default function NewInvoicePage() {
  return <CreateInvoicePageClient />;
}

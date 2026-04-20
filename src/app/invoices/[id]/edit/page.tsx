import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getInvoiceById, serializeInvoice } from "@/lib/data-invoices";
import { isMerchantPortalSessionReady } from "@/lib/data-access";
import { CreateInvoicePageClient } from "@/components/invoices/create-invoice-page-client";
import { EditInvoiceMerchantPageClient } from "@/components/invoices/edit-invoice-merchant-page-client";

type EditInvoicePageProps = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = {
  title: "Edit invoice",
};

export default async function EditInvoicePage({ params }: EditInvoicePageProps) {
  const { id } = await params;
  if (await isMerchantPortalSessionReady()) {
    return <EditInvoiceMerchantPageClient invoiceId={id} />;
  }
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();
  if (invoice.status === "Paid" || invoice.status === "Cancelled") {
    redirect(`/invoices/${id}`);
  }
  return (
    <CreateInvoicePageClient editInvoiceId={id} initialInvoice={serializeInvoice(invoice)} />
  );
}

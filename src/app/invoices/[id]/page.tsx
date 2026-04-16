import { notFound } from "next/navigation";
import { getInvoiceById, serializeInvoice } from "@/lib/data-invoices";
import { isMerchantPortalSessionReady } from "@/lib/data-access";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";
import { InvoiceDetailMerchantClient } from "@/components/invoices/invoice-detail-merchant-client";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  if (await isMerchantPortalSessionReady()) {
    return <InvoiceDetailMerchantClient id={id} />;
  }
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const serialized = serializeInvoice(invoice);

  return <InvoiceDetailView invoice={serialized} />;
}

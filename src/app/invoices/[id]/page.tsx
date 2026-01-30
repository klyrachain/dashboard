import { notFound } from "next/navigation";
import { getInvoiceById, serializeInvoice } from "@/lib/data-invoices";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";

type InvoiceDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailPage({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const invoice = await getInvoiceById(id);
  if (!invoice) notFound();

  const serialized = serializeInvoice(invoice);

  return <InvoiceDetailView invoice={serialized} />;
}

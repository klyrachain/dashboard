import { getInvoiceList } from "@/lib/data-invoices";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export default async function InvoicesPage() {
  const data = await getInvoiceList();

  return (
    <div className="space-y-6 font-primary text-body">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display font-semibold tracking-tight">
            Invoices
          </h1>
          <p className="font-secondary text-caption text-muted-foreground">
            View and manage invoices. Send new invoices to customers.
          </p>
        </div>
        <InvoicesPageClient />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        <InvoicesTable data={data} />
      </div>
    </div>
  );
}

import { getInvoiceList } from "@/lib/data-invoices";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";

export default async function InvoicesPage() {
  const { items, meta, error } = await getInvoiceList();

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
      {error && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          <strong>Could not load invoices.</strong> {error}
          <span className="block mt-1 text-amber-700">
            Ensure the Core API is running at the configured URL and the invoices
            endpoints are implemented (see md/core-invoices-api-spec.md).
          </span>
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        <InvoicesTable data={items} meta={meta} />
      </div>
    </div>
  );
}

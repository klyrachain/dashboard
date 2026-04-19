import { getInvoiceList } from "@/lib/data-invoices";
import {
  getAccessContext,
  isMerchantPortalSessionReady,
} from "@/lib/data-access";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { InvoicesPageClient } from "@/components/invoices/invoices-page-client";
import { InvoicesMerchantList } from "@/components/invoices/invoices-merchant-list";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

type InvoicesPageProps = {
  searchParams: Promise<{ status?: string; page?: string }>;
};

const VALID_STATUSES = ["Paid", "Pending", "Overdue", "Draft", "Cancelled"] as const;

export default async function InvoicesPage({ searchParams }: InvoicesPageProps) {
  const params = await searchParams;
  const status =
    params.status && (VALID_STATUSES as readonly string[]).includes(params.status)
      ? params.status
      : undefined;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;

  const merchantPortalCookies = await isMerchantPortalSessionReady();
  const access = await getAccessContext();
  const useMerchantInvoicesView =
    merchantPortalCookies ||
    (access.ok && access.context?.type === "merchant");

  if (useMerchantInvoicesView) {
    return (
      <div className="space-y-6 font-primary text-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <header className="space-y-1 min-w-0">
            <h1 className="text-display font-semibold tracking-tight">
              Invoices
            </h1>
            <p className="font-secondary text-caption text-muted-foreground max-w-prose">
              Create and track invoices you send to customers.
            </p>
          </header>
          <InvoicesPageClient statusFilter={status} />
        </div>
        <InvoicesMerchantList
          page={Number.isNaN(page) ? 1 : page}
          limit={20}
          status={status}
          statusFilter={status}
        />
      </div>
    );
  }

  const { items, meta, error } = await getInvoiceList({
    page: Number.isNaN(page) ? 1 : page,
    limit: 20,
    status,
  });

  const empty = items.length === 0 && !error;

  return (
    <div className="space-y-6 font-primary text-body">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <header className="space-y-1 min-w-0">
          <h1 className="text-display font-semibold tracking-tight">
            Invoices
          </h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            Create and track invoices you send to customers.
          </p>
        </header>
        <InvoicesPageClient statusFilter={status} />
      </div>
      {error && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        {empty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">It&apos;s quiet here</p>
            <p className="text-xs text-slate-500">
              No invoices yet. Create one to get started.
            </p>
          </div>
        ) : (
          <InvoicesTable data={items} meta={meta} statusFilter={status} />
        )}
      </div>
    </div>
  );
}

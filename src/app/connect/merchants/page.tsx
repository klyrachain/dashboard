import { getConnectMerchants } from "@/lib/data-connect";
import { getAccessContext } from "@/lib/data-access";
import { ConnectMerchantsClient } from "@/components/connect/connect-merchants-client";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

type MerchantsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; riskLevel?: string }>;
};

export default async function ConnectMerchantsPage({ searchParams }: MerchantsPageProps) {
  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const { ok, items, meta, error } = await getConnectMerchants({
    page: Number.isNaN(page) ? 1 : page,
    limit: 20,
    status: params.status && params.status !== "all" ? params.status : undefined,
    riskLevel: params.riskLevel && params.riskLevel !== "all" ? params.riskLevel : undefined,
  });

  const accessResult = await getAccessContext();
  const actingAs = accessResult.context?.type === "merchant" ? accessResult.context.business?.name : null;

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Merchants
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Partners and businesses using your payment rails.
        </p>
        {actingAs && (
          <p className="font-secondary text-caption text-slate-600 mt-1">
            Acting as <strong>{actingAs}</strong>
          </p>
        )}
      </div>
      {error && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      {ok && (
        <ConnectMerchantsClient
          initialItems={items}
          meta={meta}
          statusFilter={params.status}
          riskLevelFilter={params.riskLevel}
        />
      )}
    </div>
  );
}

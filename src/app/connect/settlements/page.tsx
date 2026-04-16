import { getConnectSettlements } from "@/lib/data-connect";
import { getAccessContext } from "@/lib/data-access";
import { ConnectSettlementsClient } from "@/components/connect/connect-settlements-client";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

type SettlementsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; id?: string }>;
};

export default async function ConnectSettlementsPage({ searchParams }: SettlementsPageProps) {
  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const { ok, items, meta, error } = await getConnectSettlements({
    page: Number.isNaN(page) ? 1 : page,
    limit: 20,
    status: params.status && params.status !== "all" ? params.status : undefined,
  });

  const accessResult = await getAccessContext();
  const actingAs = accessResult.context?.type === "merchant" ? accessResult.context.business?.name : null;

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Settlements
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Payout batches to partners. Track gross, fees, and net payouts.
        </p>
        {actingAs && (
          <p className="font-secondary text-caption text-slate-600 mt-1">
            Acting as <strong>{actingAs}</strong>
          </p>
        )}
      </div>
      {error && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      {ok && (
        <ConnectSettlementsClient
          initialItems={items}
          meta={meta}
          statusFilter={params.status}
          selectedId={params.id}
        />
      )}
    </div>
  );
}

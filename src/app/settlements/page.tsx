import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/data-access";
import { getConnectSettlements } from "@/lib/data-connect";
import { ConnectSettlementsClient } from "@/components/connect/connect-settlements-client";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

type SettlementsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; id?: string }>;
};

/** Merchant-only payouts hub. Platform admins use /connect/settlements. */
export default async function MerchantSettlementsPage({ searchParams }: SettlementsPageProps) {
  const access = await getAccessContext();
  if (!access.ok || access.context?.type !== "merchant") {
    redirect("/connect/settlements");
  }

  const params = await searchParams;
  const page = params.page ? Math.max(1, parseInt(params.page, 10)) : 1;
  const { ok, items, meta, error } = await getConnectSettlements({
    page: Number.isNaN(page) ? 1 : page,
    limit: 20,
    status: params.status && params.status !== "all" ? params.status : undefined,
  });

  const businessName = access.context?.business?.name;

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Payouts</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          When Klyra sent funds to your bank account. Gross, fees, and net.
        </p>
        {businessName ? (
          <p className="font-secondary text-caption text-slate-600 mt-1">
            <strong>{businessName}</strong>
          </p>
        ) : null}
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

import { getConnectOverview } from "@/lib/data-connect";
import { getAccessContext } from "@/lib/data-access";
import { ConnectOverviewClient } from "@/components/connect/connect-overview-client";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function ConnectOverviewPage() {
  const [overviewResult, accessResult] = await Promise.all([
    getConnectOverview(),
    getAccessContext(),
  ]);

  const { ok, data, error } = overviewResult;
  const actingAs = accessResult.context?.type === "merchant" ? accessResult.context.business?.name : null;

  return (
    <div className="space-y-8 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Connect Overview
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          B2B platform metrics: partner volume, fees, and onboarding.
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
      {ok && data ? (
        <ConnectOverviewClient data={data} />
      ) : !error ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">No data</p>
          <p className="text-xs text-slate-500">Overview requires a platform API key.</p>
        </div>
      ) : null}
    </div>
  );
}

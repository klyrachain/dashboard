import { getSettingsFinancials } from "@/lib/data-settings";
import { FinancialsSettingsForm } from "@/components/settings/financials-settings-form";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsFinancialsPage() {
  const { ok, data, error } = await getSettingsFinancials();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Financials</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Global fees, limits, and liquidity alerts.
        </p>
      </div>
      {error && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      <FinancialsSettingsForm initialData={ok && data ? data : undefined} />
    </div>
  );
}

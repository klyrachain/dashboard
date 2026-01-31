import { getSettingsRisk } from "@/lib/data-settings";
import { RiskSettingsContent } from "@/components/settings/risk-settings-content";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsRiskPage() {
  const { ok, data, error } = await getSettingsRisk();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Risk &amp; Compliance
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          KYC rules, high-risk IP blocking, and global blacklists.
        </p>
      </div>
      {error && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      <RiskSettingsContent initialData={ok ? data : undefined} />
    </div>
  );
}

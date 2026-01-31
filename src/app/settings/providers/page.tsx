import { getProvidersFromCore } from "@/lib/data-providers";
import { ProvidersSettingsContent } from "@/components/settings/providers-settings-content";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsProvidersPage() {
  const { ok, data: providers, error } = await getProvidersFromCore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Providers &amp; Routing
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Enable/disable providers and set routing priority. Toggle off broken providers to stop routing there.
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
      <ProvidersSettingsContent initialProviders={ok ? providers : undefined} />
    </div>
  );
}

import { getSettingsApi } from "@/lib/data-settings";
import { ApiSettingsContent } from "@/components/settings/api-settings-content";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsApiPage() {
  const { ok, data, error } = await getSettingsApi();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          API &amp; Webhooks
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Webhook signing secret and notification channels for internal alerts.
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
      <ApiSettingsContent initialData={ok ? data : undefined} />
    </div>
  );
}

import { getSettingsGeneral } from "@/lib/data-settings";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsGeneralPage() {
  const { ok, data, error } = await getSettingsGeneral();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">General</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Branding, defaults, and maintenance mode.
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
      <GeneralSettingsForm initialData={ok ? data : undefined} />
    </div>
  );
}

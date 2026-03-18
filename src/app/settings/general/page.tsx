import { getSettingsGeneral } from "@/lib/data-settings";
import { getAccessContext } from "@/lib/data-access";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsGeneralPage() {
  const [{ ok, data, error }, access] = await Promise.all([
    getSettingsGeneral(),
    getAccessContext(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          {access.ok && access.context?.type === "merchant" ? "Business profile" : "General"}
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          {access.ok && access.context?.type === "merchant"
            ? "Logo, public business name, and support contact."
            : "Branding, defaults, and maintenance mode."}
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

import { getSettingsGeneral } from "@/lib/data-settings";
import { getAccessContext } from "@/lib/data-access";
import { GeneralSettingsForm } from "@/components/settings/general-settings-form";
import { MerchantBusinessProfileForm } from "@/components/settings/merchant-business-profile-form";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsGeneralPage() {
  const access = await getAccessContext();

  if (access.ok && access.context?.type === "merchant") {
    return (
      <div className="space-y-6 font-primary text-body">
        <header className="space-y-1">
          <h1 className="text-display font-semibold tracking-tight">
            Business profile
          </h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            Your brand, contact details, and webhook URL for this business.
          </p>
        </header>
        <MerchantBusinessProfileForm />
      </div>
    );
  }

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

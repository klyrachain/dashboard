import { getSettingsTeamAdmins } from "@/lib/data-settings";
import { TeamSettingsContent } from "@/components/settings/team-settings-content";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsTeamPage() {
  const { ok, data: admins, error } = await getSettingsTeamAdmins();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Team</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          Admin list and access control. Invite staff and assign roles.
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
      <TeamSettingsContent initialAdmins={ok ? admins : undefined} />
    </div>
  );
}

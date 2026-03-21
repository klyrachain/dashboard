import { getSettingsTeamAdmins } from "@/lib/data-settings";
import { TeamSettingsContent } from "@/components/settings/team-settings-content";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function SettingsTeamPage() {
  const { ok, data: admins, error } = await getSettingsTeamAdmins();

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Team</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Invite people and choose what they can see and do.
        </p>
      </header>
      {error && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      <TeamSettingsContent initialAdmins={ok ? admins : undefined} />
    </div>
  );
}

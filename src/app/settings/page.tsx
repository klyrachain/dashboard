import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CoreStatusCard } from "@/components/settings/core-status-card";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Configure backoffice and system preferences.
        </p>
      </div>

      <CoreStatusCard />

      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Placeholder for future settings (API keys, notifications, etc.).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Settings UI will be added here.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

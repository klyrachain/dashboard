"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import type { SettingsApi } from "@/lib/data-settings";
import { saveApiAction, rotateWebhookSecretAction } from "@/app/settings/actions";

type ApiSettingsContentProps = {
  initialData?: SettingsApi | null;
};

export function ApiSettingsContent({ initialData }: ApiSettingsContentProps) {
  const [webhookSecretMasked, setWebhookSecretMasked] = useState(
    () => initialData?.webhookSigningSecretMasked ?? ""
  );
  const [slackWebhookUrl, setSlackWebhookUrl] = useState("");
  const [alertEmails, setAlertEmails] = useState("");
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    queueMicrotask(() => {
      setWebhookSecretMasked(initialData.webhookSigningSecretMasked);
      setSlackWebhookUrl(initialData.slackWebhookUrl ?? "");
      setAlertEmails(initialData.alertEmails ?? "");
    });
  }, [initialData]);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Webhook signing secret</CardTitle>
          <CardDescription>
            Used to sign webhooks sent to merchants so they can verify the payload came from you.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <code className="rounded bg-slate-100 px-2 py-1 font-mono text-sm text-slate-700">
              {webhookSecretMasked}
            </code>
            <CopyButton value={webhookSecretMasked} />
          </div>
          <Button
            variant="outline"
            className="text-amber-700 border-amber-200 hover:bg-amber-50"
            disabled={rotating}
            onClick={async () => {
              setRotating(true);
              setSaveError(null);
              const result = await rotateWebhookSecretAction();
              setRotating(false);
              if (result.success && result.webhookSigningSecretMasked) {
                setWebhookSecretMasked(result.webhookSigningSecretMasked);
              } else if (!result.success) {
                setSaveError(result.error ?? "Rotate failed");
              }
            }}
          >
            {rotating ? "Rotating…" : "Rotate secret"}
          </Button>
          <p className="text-xs text-slate-500">
            Rotate after a security breach. Merchants will need to update their verification.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Notification channels</CardTitle>
          <CardDescription>
            Internal team alerts (e.g. &quot;New high value order&quot;, &quot;Server down&quot;).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="slack">Slack webhook URL</Label>
            <Input
              id="slack"
              type="url"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              className="font-mono text-sm"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="alertEmails">Alert email list</Label>
            <Input
              id="alertEmails"
              type="text"
              value={alertEmails}
              onChange={(e) => setAlertEmails(e.target.value)}
              placeholder="dev@example.com, ops@example.com"
              className="font-mono text-sm"
            />
            <p className="text-xs text-slate-500">Comma-separated list of dev/ops emails.</p>
          </div>
        </CardContent>
      </Card>

      {saveError && (
        <p className="text-sm text-destructive" role="alert">{saveError}</p>
      )}
      <Button
        disabled={saving}
        onClick={async () => {
          setSaving(true);
          setSaveError(null);
          const result = await saveApiAction({
            slackWebhookUrl: slackWebhookUrl || undefined,
            alertEmails: alertEmails || undefined,
          });
          setSaving(false);
          if (result.success) return;
          setSaveError(result.error ?? "Save failed");
        }}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

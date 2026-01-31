"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import type { SettingsRisk } from "@/lib/data-settings";
import { saveRiskAction } from "@/app/settings/actions";

type RiskSettingsContentProps = {
  initialData?: SettingsRisk | null;
};

export function RiskSettingsContent({ initialData }: RiskSettingsContentProps) {
  const [enforceKycOver1000, setEnforceKycOver1000] = useState(true);
  const [blockHighRiskIp, setBlockHighRiskIp] = useState(true);
  const [blacklistText, setBlacklistText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setEnforceKycOver1000(initialData.enforceKycOver1000);
      setBlockHighRiskIp(initialData.blockHighRiskIp);
      setBlacklistText(initialData.blacklist?.length ? initialData.blacklist.join("\n") : "");
    }
  }, [initialData]);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>KYC requirements</CardTitle>
          <CardDescription>
            Enforce KYC above a threshold and block high-risk IPs (e.g. via Cloudflare).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
            <Label htmlFor="kyc1000" className="font-medium">
              Enforce KYC for &gt; $1000
            </Label>
            <Switch
              id="kyc1000"
              checked={enforceKycOver1000}
              onCheckedChange={setEnforceKycOver1000}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-slate-200 px-4 py-3">
            <Label htmlFor="highRiskIp" className="font-medium">
              Block high-risk IP addresses
            </Label>
            <Switch
              id="highRiskIp"
              checked={blockHighRiskIp}
              onCheckedChange={setBlockHighRiskIp}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Global blacklist</CardTitle>
          <CardDescription>
            Banned wallet addresses or domains. Any transaction involving these is auto-rejected.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="blacklist">Banned addresses or domains (one per line)</Label>
          <textarea
            id="blacklist"
            className="mt-2 min-h-[160px] w-full rounded-md border border-slate-200 px-3 py-2 font-mono text-sm"
            value={blacklistText}
            onChange={(e) => setBlacklistText(e.target.value)}
            placeholder={"0x1234...\nbaddomain.com"}
          />
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
          const blacklist = blacklistText
            .split(/\n/)
            .map((s) => s.trim())
            .filter(Boolean);
          const result = await saveRiskAction({
            enforceKycOver1000,
            blockHighRiskIp,
            blacklist,
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

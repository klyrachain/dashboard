"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SettingsGeneral } from "@/lib/data-settings";
import { saveGeneralAction } from "@/app/settings/actions";

type GeneralSettingsFormProps = {
  initialData?: SettingsGeneral | null;
};

const defaults: SettingsGeneral = {
  publicName: "",
  supportEmail: "",
  supportPhone: "",
  defaultCurrency: "USD",
  timezone: "Africa/Accra",
  maintenanceMode: false,
};

export function GeneralSettingsForm({ initialData }: GeneralSettingsFormProps) {
  const [publicName, setPublicName] = useState(defaults.publicName);
  const [supportEmail, setSupportEmail] = useState(defaults.supportEmail);
  const [supportPhone, setSupportPhone] = useState(defaults.supportPhone);
  const [defaultCurrency, setDefaultCurrency] = useState(defaults.defaultCurrency);
  const [timezone, setTimezone] = useState(defaults.timezone);
  const [maintenanceMode, setMaintenanceMode] = useState(defaults.maintenanceMode);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!initialData) return;
    queueMicrotask(() => {
      setPublicName(initialData.publicName);
      setSupportEmail(initialData.supportEmail);
      setSupportPhone(initialData.supportPhone ?? "");
      setDefaultCurrency(initialData.defaultCurrency);
      setTimezone(initialData.timezone);
      setMaintenanceMode(initialData.maintenanceMode);
    });
  }, [initialData]);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Platform profile</CardTitle>
          <CardDescription>
            Used in emails and public-facing copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="publicName">Public name</Label>
            <Input
              id="publicName"
              value={publicName}
              onChange={(e) => setPublicName(e.target.value)}
              placeholder=""
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportEmail">Support email</Label>
            <Input
              id="supportEmail"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="supportPhone">Support phone (optional)</Label>
            <Input
              id="supportPhone"
              type="tel"
              value={supportPhone}
              onChange={(e) => setSupportPhone(e.target.value)}
              placeholder="+1 234 567 8900"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Localization defaults</CardTitle>
          <CardDescription>
            Default currency and timezone for the platform.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Default currency</Label>
            <Select value={defaultCurrency} onValueChange={setDefaultCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="USDC">USDC</SelectItem>
                <SelectItem value="GHS">GHS</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Africa/Accra">GMT Accra</SelectItem>
                <SelectItem value="America/New_York">Eastern (US)</SelectItem>
                <SelectItem value="UTC">UTC</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-amber-900">Maintenance mode</CardTitle>
          <CardDescription>
            When enabled, blocks all new POST /order requests at the API gateway.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-md border border-amber-200 bg-white px-4 py-3">
            <Label htmlFor="maintenance" className="font-medium text-amber-900">
              Enable maintenance mode
            </Label>
            <Switch
              id="maintenance"
              checked={maintenanceMode}
              onCheckedChange={setMaintenanceMode}
            />
          </div>
          {maintenanceMode && (
            <p className="mt-2 text-sm font-medium text-amber-800">
              Maintenance mode is ON. New orders are blocked.
            </p>
          )}
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
          const result = await saveGeneralAction({
            publicName,
            supportEmail,
            supportPhone: supportPhone || undefined,
            defaultCurrency,
            timezone,
            maintenanceMode,
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

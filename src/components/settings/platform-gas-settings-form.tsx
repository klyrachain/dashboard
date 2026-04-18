"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { PlatformGasBusinessRow, PlatformGasSettings } from "@/lib/data-gas";
import { savePlatformGasAction, creditBusinessGasAction } from "@/app/settings/gas/actions";

type PlatformGasSettingsFormProps = {
  initialSettings: PlatformGasSettings | null;
  initialBusinesses: PlatformGasBusinessRow[];
};

export function PlatformGasSettingsForm({
  initialSettings,
  initialBusinesses,
}: PlatformGasSettingsFormProps) {
  const [sponsorshipEnabled, setSponsorshipEnabled] = useState(false);
  const [maxUsdPerTx, setMaxUsdPerTx] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditBusinessId, setCreditBusinessId] = useState("");
  const [creditAmount, setCreditAmount] = useState("");
  const [creditIdem, setCreditIdem] = useState("");
  const [creditBusy, setCreditBusy] = useState(false);

  useEffect(() => {
    if (!initialSettings) return;
    queueMicrotask(() => {
      setSponsorshipEnabled(initialSettings.sponsorshipEnabled);
      setMaxUsdPerTx(initialSettings.maxUsdPerTx ?? "");
      setNotes(initialSettings.notes ?? "");
    });
  }, [initialSettings]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const maxParsed =
      maxUsdPerTx.trim() === "" ? null : parseFloat(maxUsdPerTx.trim());
    const r = await savePlatformGasAction({
      sponsorshipEnabled,
      maxUsdPerTx: maxParsed != null && Number.isFinite(maxParsed) ? maxParsed : null,
      notes: notes.trim() === "" ? null : notes.trim(),
    });
    setSaving(false);
    if (!r.ok) setError(r.error);
  }

  async function onCredit(e: React.FormEvent) {
    e.preventDefault();
    setCreditBusy(true);
    setError(null);
    const amount = parseFloat(creditAmount.trim());
    if (!creditBusinessId.trim() || !creditIdem.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Enter business UUID, positive amount, and idempotency key.");
      setCreditBusy(false);
      return;
    }
    const r = await creditBusinessGasAction({
      businessId: creditBusinessId.trim(),
      amountUsd: amount,
      idempotencyKey: creditIdem.trim(),
      reason: "TOPUP",
    });
    setCreditBusy(false);
    if (!r.ok) setError(r.error);
    else {
      setCreditAmount("");
      setCreditIdem("");
    }
  }

  return (
    <div className="space-y-8">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Platform gas sponsorship</CardTitle>
          <CardDescription>
            When enabled, platform policy can sponsor user operations subject to max per transaction
            (configure ZeroDev / Dynamic paymaster in the Dynamic dashboard).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSave} className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={sponsorshipEnabled}
                onChange={(e) => setSponsorshipEnabled(e.target.checked)}
                className="size-4 rounded border"
              />
              Enable platform-wide gas sponsorship
            </label>
            <div className="space-y-2">
              <Label htmlFor="maxUsdPerTx">Max USD per sponsored transaction (optional)</Label>
              <Input
                id="maxUsdPerTx"
                type="text"
                inputMode="decimal"
                value={maxUsdPerTx}
                onChange={(e) => setMaxUsdPerTx(e.target.value)}
                placeholder="e.g. 5.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gasNotes">Internal notes</Label>
              <Input id="gasNotes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            {error && (
              <p className="text-sm text-amber-800" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save platform settings"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Credit business gas balance</CardTitle>
          <CardDescription>
            Record a top-up after the business funds your platform (manual reconciliation).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onCredit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="bid">Business ID (UUID)</Label>
              <Input
                id="bid"
                value={creditBusinessId}
                onChange={(e) => setCreditBusinessId(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amt">Amount (USD)</Label>
              <Input
                id="amt"
                type="text"
                inputMode="decimal"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idem">Idempotency key</Label>
              <Input
                id="idem"
                value={creditIdem}
                onChange={(e) => setCreditIdem(e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" variant="secondary" disabled={creditBusy}>
                {creditBusy ? "Applying…" : "Credit balance"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section aria-labelledby="gas-businesses-heading">
        <h2 id="gas-businesses-heading" className="text-lg font-semibold tracking-tight">
          Businesses with gas accounts
        </h2>
        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 font-medium">Business</th>
                <th className="px-3 py-2 font-medium">Balance USD</th>
                <th className="px-3 py-2 font-medium">Sponsorship</th>
                <th className="px-3 py-2 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {initialBusinesses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-slate-500">
                    No business gas accounts yet.
                  </td>
                </tr>
              ) : (
                initialBusinesses.map((row) => (
                  <tr key={row.businessId} className="border-t border-slate-100">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.businessName}</div>
                      <div className="text-xs text-slate-500">{row.slug}</div>
                    </td>
                    <td className="px-3 py-2 font-mono">{row.prepaidBalanceUsd}</td>
                    <td className="px-3 py-2">{row.sponsorshipEnabled ? "On" : "Off"}</td>
                    <td className="px-3 py-2 text-slate-600">{row.updatedAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

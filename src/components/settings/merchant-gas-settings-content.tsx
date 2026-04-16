"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useGetMerchantGasAccountQuery,
  usePatchMerchantGasAccountMutation,
} from "@/store/merchant-api";

export function MerchantGasSettingsContent() {
  const { data, isLoading, error, refetch } = useGetMerchantGasAccountQuery();
  const [patch, { isLoading: saving }] = usePatchMerchantGasAccountMutation();
  const [warn, setWarn] = useState("");

  async function onToggle(enabled: boolean) {
    await patch({ sponsorshipEnabled: enabled }).unwrap();
    void refetch();
  }

  async function onSaveWarn(e: React.FormEvent) {
    e.preventDefault();
    const v = warn.trim() === "" ? null : parseFloat(warn.trim());
    await patch({
      lowBalanceWarnUsd: v != null && Number.isFinite(v) ? v : null,
    }).unwrap();
    void refetch();
  }

  if (isLoading) {
    return <p className="font-secondary text-caption text-muted-foreground">Loading gas settings…</p>;
  }
  if (error || data == null) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
        Could not load gas account.
      </p>
    );
  }

  const balance = data.prepaidBalanceUsd ?? "0";
  const enabled = data.sponsorshipEnabled ?? false;

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Gas sponsorship</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Prepay gas so your customers can complete sponsored transactions. Fund this balance with your
          platform operator before enabling sponsorship.
        </p>
      </header>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Balance</CardTitle>
          <CardDescription>Prepaid USD balance for sponsored gas (ledger in Core).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-2xl font-semibold tabular-nums">{balance}</p>
          <p className="text-sm text-muted-foreground">
            Contact platform support to top up. When balance is zero, sponsorship cannot be enabled.
          </p>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Sponsor gas for payers</CardTitle>
          <CardDescription>
            Only available when your prepaid balance is above zero. Actual sponsorship uses Dynamic /
            ZeroDev on the checkout app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="flex items-center gap-2 text-sm font-medium">
            <input
              type="checkbox"
              checked={enabled}
              disabled={parseFloat(balance) <= 0}
              onChange={(e) => void onToggle(e.target.checked)}
              className="size-4 rounded border"
            />
            Enable gas sponsorship for my checkout flows
          </label>
          <form onSubmit={(e) => void onSaveWarn(e)} className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Label htmlFor="lowWarn">Low balance warning (USD)</Label>
              <Input
                id="lowWarn"
                value={warn}
                onChange={(e) => setWarn(e.target.value)}
                placeholder={data?.lowBalanceWarnUsd ?? ""}
              />
            </div>
            <Button type="submit" variant="secondary" disabled={saving}>
              Save threshold
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

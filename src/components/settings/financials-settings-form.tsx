"use client";

import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { setBaseCurrency as setPreferencesBaseCurrency } from "@/store/preferences-slice";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SettingsFinancials } from "@/lib/data-settings";
import { QUOTE_CURRENCIES } from "@/lib/token-rates";
import type { QuoteCurrency } from "@/lib/token-rates";
import { saveFinancialsAction } from "@/app/settings/actions";

type FinancialsSettingsFormProps = {
  initialData?: SettingsFinancials | null;
};

function toStr(n: number): string {
  return String(n);
}

function toNum(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function FinancialsSettingsForm({ initialData }: FinancialsSettingsFormProps) {
  const dispatch = useDispatch<AppDispatch>();
  const [baseFeePercent, setBaseFeePercent] = useState("1.00");
  const [fixedFee, setFixedFee] = useState("0.50");
  const [minTxSize, setMinTxSize] = useState("5.00");
  const [maxTxSize, setMaxTxSize] = useState("10000.00");
  const [lowBalanceAlert, setLowBalanceAlert] = useState("500.00");
  const [baseCurrency, setBaseCurrencyState] = useState<QuoteCurrency>("usdc");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setBaseFeePercent(toStr(initialData.baseFeePercent));
      setFixedFee(toStr(initialData.fixedFee));
      setMinTxSize(toStr(initialData.minTransactionSize));
      setMaxTxSize(toStr(initialData.maxTransactionSize));
      setLowBalanceAlert(toStr(initialData.lowBalanceAlert));
      setBaseCurrencyState(initialData.baseCurrency ?? "usdc");
    }
  }, [initialData]);

  return (
    <div className="space-y-6">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Base currency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseCurrency">Platform display currency</Label>
            <Select
              value={baseCurrency}
              onValueChange={(v) => setBaseCurrencyState(v as QuoteCurrency)}
            >
              <SelectTrigger id="baseCurrency" className="w-34">
                <SelectValue placeholder="Currency" />
              </SelectTrigger>
              <SelectContent>
                {QUOTE_CURRENCIES.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Totals and conversions (dashboard, inventory) use this currency by default.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Global fee schedule (defaults)</CardTitle>
          <CardDescription>
            Applied when a merchant has no custom FeeSchedule override.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseFee">Base platform fee (%)</Label>
            <Input
              id="baseFee"
              type="text"
              value={baseFeePercent}
              onChange={(e) => setBaseFeePercent(e.target.value)}
              placeholder="1.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixedFee">Fixed fee ($)</Label>
            <Input
              id="fixedFee"
              type="text"
              value={fixedFee}
              onChange={(e) => setFixedFee(e.target.value)}
              placeholder="0.50"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Transaction limits</CardTitle>
          <CardDescription>
            Min avoids dust; max limits risk exposure.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="minTx">Min transaction size ($)</Label>
            <Input
              id="minTx"
              type="text"
              value={minTxSize}
              onChange={(e) => setMinTxSize(e.target.value)}
              placeholder="5.00"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxTx">Max transaction size ($)</Label>
            <Input
              id="maxTx"
              type="text"
              value={maxTxSize}
              onChange={(e) => setMaxTxSize(e.target.value)}
              placeholder="10000.00"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Liquidity thresholds</CardTitle>
          <CardDescription>
            When a wallet drops below this, admins get Slack/email alerts.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lowBalance">Low balance alert ($)</Label>
            <Input
              id="lowBalance"
              type="text"
              value={lowBalanceAlert}
              onChange={(e) => setLowBalanceAlert(e.target.value)}
              placeholder="500.00"
            />
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
          const result = await saveFinancialsAction({
            baseFeePercent: Math.max(0, Math.min(100, toNum(baseFeePercent))),
            fixedFee: Math.max(0, toNum(fixedFee)),
            minTransactionSize: Math.max(0, toNum(minTxSize)),
            maxTransactionSize: Math.max(0, toNum(maxTxSize)),
            lowBalanceAlert: Math.max(0, toNum(lowBalanceAlert)),
            baseCurrency,
          });
          setSaving(false);
          if (result.success) {
            dispatch(setPreferencesBaseCurrency(baseCurrency));
            return;
          }
          setSaveError(result.error ?? "Save failed");
        }}
      >
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </div>
  );
}

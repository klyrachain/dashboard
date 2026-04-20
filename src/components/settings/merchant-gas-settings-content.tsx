"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useGetMerchantBusinessQuery,
  useGetMerchantGasAccountQuery,
  usePatchMerchantGasAccountMutation,
  usePostMerchantGasPaystackInitializeMutation,
  usePostMerchantGasTopupFromClearingMutation,
  usePostMerchantGasTopupPrepareMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";

export function MerchantGasSettingsContent() {
  const { skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();
  const { data, isLoading, error, refetch } = useGetMerchantGasAccountQuery(
    { merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const { data: business } = useGetMerchantBusinessQuery(undefined, {
    skip: skipMerchantApi,
  });
  const [patch, { isLoading: saving }] = usePatchMerchantGasAccountMutation();
  const [topupClearing, { isLoading: toppingClearing }] =
    usePostMerchantGasTopupFromClearingMutation();
  const [prepareTopup, { isLoading: preparing }] = usePostMerchantGasTopupPrepareMutation();
  const [paystackInit, { isLoading: paystackLoading }] =
    usePostMerchantGasPaystackInitializeMutation();

  const [warn, setWarn] = useState("");
  const [fundOpen, setFundOpen] = useState(false);
  const [fundStep, setFundStep] = useState<"pick" | "balance" | "fiat" | "crypto">("pick");
  const [amountStr, setAmountStr] = useState("");
  const [fundError, setFundError] = useState<string | null>(null);

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

  function resetFundModal() {
    setFundStep("pick");
    setAmountStr("");
    setFundError(null);
  }

  function closeFundModal(open: boolean) {
    setFundOpen(open);
    if (!open) resetFundModal();
  }

  async function onSubmitFromClearing() {
    setFundError(null);
    const amountUsd = parseFloat(amountStr.trim());
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setFundError("Enter a valid amount.");
      return;
    }
    try {
      await topupClearing({
        amountUsd,
        idempotencyKey: crypto.randomUUID(),
      }).unwrap();
      closeFundModal(false);
      void refetch();
    } catch (e) {
      setFundError(e instanceof Error ? e.message : "Could not move funds.");
    }
  }

  async function onPaystackTopup() {
    setFundError(null);
    const amountUsd = parseFloat(amountStr.trim());
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setFundError("Enter a valid amount.");
      return;
    }
    try {
      const prep = await prepareTopup({
        amountUsd,
        purpose: "GAS_TOPUP_FIAT",
      }).unwrap();
      if (!prep?.paymentLinkId) {
        setFundError("Could not create payment session.");
        return;
      }
      const init = await paystackInit({
        paymentLinkId: prep.paymentLinkId,
        payer_email: business?.supportEmail?.trim() || undefined,
      }).unwrap();
      if (init?.authorization_url) {
        window.location.href = init.authorization_url;
      } else {
        setFundError("Paystack did not return a checkout URL.");
      }
    } catch (e) {
      setFundError(e instanceof Error ? e.message : "Paystack start failed.");
    }
  }

  async function onCryptoTopup() {
    setFundError(null);
    const amountUsd = parseFloat(amountStr.trim());
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setFundError("Enter a valid amount.");
      return;
    }
    try {
      const prep = await prepareTopup({
        amountUsd,
        purpose: "GAS_TOPUP_CRYPTO",
      }).unwrap();
      if (!prep?.checkoutAbsoluteUrl) {
        setFundError("Could not create checkout link.");
        return;
      }
      window.open(prep.checkoutAbsoluteUrl, "_blank", "noopener,noreferrer");
      closeFundModal(false);
    } catch (e) {
      setFundError(e instanceof Error ? e.message : "Could not create link.");
    }
  }

  if (skipMerchantApi) {
    return (
      <section
        className="rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center"
        aria-labelledby="gas-no-tenant-title"
      >
        <h2 id="gas-no-tenant-title" className="text-sm font-medium text-foreground">
          Select a business
        </h2>
        <p className="mt-2 font-secondary text-caption text-muted-foreground" role="status">
          Choose a business in the header to load gas sponsorship and balances.
        </p>
      </section>
    );
  }

  if (isLoading) {
    return <p className="font-secondary text-caption text-muted-foreground">Loading gas settings…</p>;
  }
  if (error || data == null) {
    return (
      <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900" role="alert">
        Could not load gas account.
        {error && typeof error === "object" && "status" in error ? (
          <span className="ml-1 font-mono text-xs">({String((error as { status: unknown }).status)})</span>
        ) : null}
      </p>
    );
  }

  const balance = data.prepaidBalanceUsd ?? "0";
  const clearing = data.clearingBalanceUsd ?? "0";
  const enabled = data.sponsorshipEnabled ?? false;

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Gas sponsorship</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Prepay gas so customers can complete sponsored transactions. Use your Morapay clearing
          balance, Paystack, or crypto checkout to add funds.
        </p>
      </header>

      <Card className="bg-white">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Balances</CardTitle>
            <CardDescription>
              Gas prepaid (sponsorship) vs Morapay clearing (settled commerce, before payout).
            </CardDescription>
          </div>
          <Button type="button" onClick={() => setFundOpen(true)}>
            Add prepaid gas
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Gas prepaid</p>
            <p className="text-2xl font-semibold tabular-nums">{balance} USD</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase text-muted-foreground">Morapay clearing</p>
            <p className="text-2xl font-semibold tabular-nums">{clearing} USD</p>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Sponsor gas for payers</CardTitle>
          <CardDescription>
            Only available when your prepaid balance is above zero. Sponsorship uses your checkout
            gas policy (Core + checkout app).
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

      <Dialog open={fundOpen} onOpenChange={closeFundModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add prepaid gas</DialogTitle>
            <DialogDescription>
              Choose how to fund your gas balance. Clearing transfers are instant; Paystack opens
              card/bank pay; crypto opens a one-time checkout in a new tab.
            </DialogDescription>
          </DialogHeader>

          {fundStep === "pick" && (
            <div className="grid gap-2 py-2">
              <Button type="button" variant="secondary" onClick={() => setFundStep("balance")}>
                Use Morapay clearing balance
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFundStep("fiat")}>
                Pay with fiat (Paystack)
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFundStep("crypto")}>
                Pay with crypto (checkout)
              </Button>
            </div>
          )}

          {(fundStep === "balance" || fundStep === "fiat" || fundStep === "crypto") && (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <Label htmlFor="gas-amt">Amount (USD)</Label>
                <Input
                  id="gas-amt"
                  inputMode="decimal"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  placeholder="e.g. 50"
                />
              </div>
              {fundError ? (
                <p className="text-sm text-destructive" role="alert">
                  {fundError}
                </p>
              ) : null}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            {fundStep !== "pick" ? (
              <Button type="button" variant="ghost" onClick={() => resetFundModal()}>
                Back
              </Button>
            ) : null}
            {fundStep === "balance" ? (
              <Button
                type="button"
                onClick={() => void onSubmitFromClearing()}
                disabled={toppingClearing}
              >
                {toppingClearing ? "Adding…" : "Add gas"}
              </Button>
            ) : null}
            {fundStep === "fiat" ? (
              <Button
                type="button"
                onClick={() => void onPaystackTopup()}
                disabled={preparing || paystackLoading}
              >
                {preparing || paystackLoading ? "Starting…" : "Continue to Paystack"}
              </Button>
            ) : null}
            {fundStep === "crypto" ? (
              <Button type="button" onClick={() => void onCryptoTopup()} disabled={preparing}>
                {preparing ? "Creating…" : "Open checkout"}
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

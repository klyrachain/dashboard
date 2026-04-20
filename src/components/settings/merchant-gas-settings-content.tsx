"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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
import { Skeleton } from "@/components/ui/skeleton";

function MerchantGasSettingsSkeleton() {
  return (
    <div className="space-y-6 font-primary text-body" role="status" aria-live="polite">
      <header className="space-y-2">
        <Skeleton className="h-9 w-[min(280px,70%)] max-w-md" />
        <Skeleton className="h-4 w-full max-w-prose" />
        <Skeleton className="h-4 w-[min(480px,90%)] max-w-prose" />
      </header>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-full max-w-md" />
            <Skeleton className="h-4 w-full max-w-sm" />
          </div>
          <Skeleton className="h-10 w-[140px] shrink-0 rounded-md" />
        </div>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-36" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-8 w-36" />
          </div>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="mt-2 h-4 w-full max-w-lg" />
        <Skeleton className="mt-1 h-4 w-full max-w-md" />
        <div className="mt-6 space-y-4">
          <Skeleton className="h-5 w-64" />
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-10 w-48 rounded-md" />
            </div>
            <Skeleton className="h-10 w-32 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}

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
    const clearingNum = parseFloat(String(clearing).replace(/,/g, ""));
    if (Number.isFinite(clearingNum) && amountUsd > clearingNum + 1e-9) {
      setFundError("That amount is more than your Morapay clearing balance.");
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
    return <MerchantGasSettingsSkeleton />;
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
          </DialogHeader>

          {fundStep === "pick" && (
            <div className="grid gap-2 py-2">
              <Button type="button" variant="secondary" onClick={() => setFundStep("balance")}>
                Morapay balance
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFundStep("fiat")}>
                Pay with fiat
              </Button>
              <Button type="button" variant="secondary" onClick={() => setFundStep("crypto")}>
                Pay with crypto
              </Button>
            </div>
          )}

          {(fundStep === "balance" || fundStep === "fiat" || fundStep === "crypto") && (
            <div className="space-y-3 py-2">
              {fundStep === "balance" ? (
                <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Morapay clearing balance
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">
                    {clearing} USD
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Current gas prepaid: <span className="font-medium text-foreground">{balance} USD</span>.
                    Enter how much to move from clearing into gas.
                  </p>
                </div>
              ) : null}
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

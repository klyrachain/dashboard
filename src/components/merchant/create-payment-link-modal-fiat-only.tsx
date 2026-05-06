"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PLATFORM_PRIMARY_HEX } from "@/lib/platform-theme";
import { PaymentLinkCurrencyPicker } from "@/components/merchant/payment-link-currency-picker";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePatchMerchantBusinessMutation, usePostMerchantPayPageMutation } from "@/store/merchant-api";
import type { MerchantBusinessProfile } from "@/types/merchant-api";
import {
  PAYMENT_LINK_COUNTRY_FIAT_OPTIONS,
  normalizeCountryCode,
  resolveFiatCurrencyForCountry,
} from "@/lib/payment-link-fiat-countries";

type CreatePaymentLinkModalFiatOnlyProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  business?: MerchantBusinessProfile | null;
  globalGasToggleOn: boolean;
  initialProductId?: string;
  initialTitle?: string;
  onCreated?: () => void;
};

type LinkUsage = "unlimited" | "onetime";

function getMutationError(error: unknown): string | null {
  if (!error || typeof error !== "object" || !("data" in error)) return null;
  const data = (error as { data?: { error?: string } }).data;
  return data?.error?.trim() || null;
}

export function CreatePaymentLinkModalFiatOnly({
  open,
  onOpenChange,
  business,
  globalGasToggleOn,
  initialProductId,
  initialTitle,
  onCreated,
}: CreatePaymentLinkModalFiatOnlyProps) {
  const savedCountryCode = normalizeCountryCode(business?.country);
  const defaultCountryCode = savedCountryCode || "GH";
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(defaultCountryCode);
  const [currencyCode, setCurrencyCode] = useState(
    resolveFiatCurrencyForCountry(defaultCountryCode)
  );
  const [linkUsage, setLinkUsage] = useState<LinkUsage>("unlimited");
  const [gasSponsorshipEnabled, setGasSponsorshipEnabled] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [postLink, { isLoading: posting, error: postError }] =
    usePostMerchantPayPageMutation();
  const [patchBusiness, { isLoading: savingCountry, error: countryError }] =
    usePatchMerchantBusinessMutation();

  const needsCountrySelection = savedCountryCode.length === 0;
  const busy = posting || savingCountry;
  const amountNumber = Number.parseFloat(amount);
  const selectedCountryOption = useMemo(
    () => PAYMENT_LINK_COUNTRY_FIAT_OPTIONS.find((option) => option.code === selectedCountry),
    [selectedCountry]
  );

  useEffect(() => {
    if (!open) return;
    const nextCountry = savedCountryCode || "GH";
    queueMicrotask(() => {
      setTitle(initialTitle?.trim() ?? "");
      setAmount("");
      setSelectedCountry(nextCountry);
      setCurrencyCode(resolveFiatCurrencyForCountry(nextCountry));
      setLinkUsage("unlimited");
      setGasSponsorshipEnabled(false);
      setFormError(null);
    });
  }, [open, savedCountryCode, initialTitle]);

  const submitDisabled =
    busy ||
    !title.trim() ||
    !Number.isFinite(amountNumber) ||
    amountNumber <= 0 ||
    !currencyCode.trim() ||
    (needsCountrySelection && !selectedCountry);

  const gasToggleDisabledReason = !globalGasToggleOn
    ? "Enable gas sponsorship first on Settings > Gas before enabling it per link."
    : undefined;

  const handleCountryChange = (countryCode: string) => {
    const normalized = normalizeCountryCode(countryCode);
    setSelectedCountry(normalized);
    setCurrencyCode(resolveFiatCurrencyForCountry(normalized));
  };

  const handleSubmit = async () => {
    setFormError(null);
    const normalizedCurrency = currencyCode.trim().toUpperCase();
    if (submitDisabled || !normalizedCurrency) return;

    try {
      if (needsCountrySelection) {
        await patchBusiness({ country: selectedCountry }).unwrap();
      }

      await postLink({
        title: title.trim(),
        ...(initialProductId?.trim() ? { productId: initialProductId.trim() } : {}),
        amount: amountNumber,
        currency: normalizedCurrency,
        chargeKind: "FIAT",
        gasSponsorshipEnabled: gasSponsorshipEnabled === true && globalGasToggleOn === true,
        isOneTime: linkUsage === "onetime",
        isActive: true,
      }).unwrap();

      onCreated?.();
      onOpenChange(false);
    } catch (error: unknown) {
      setFormError(getMutationError(error) ?? "Could not create payment link. Try again.");
    }
  };

  const visibleError =
    formError ?? getMutationError(countryError) ?? getMutationError(postError);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-none sm:max-w-xl" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Generate a fiat payment link</DialogTitle>
        </DialogHeader>

        <form
          className="grid gap-6 py-2"
          onSubmit={(event) => {
            event.preventDefault();
            void handleSubmit();
          }}
        >
          {initialProductId ? (
            <p className="text-sm text-muted-foreground">
              Prefilled product ID: {" "}
              <span className="font-mono text-xs">{initialProductId}</span>
            </p>
          ) : null}

          <section className="space-y-2">
            <Label htmlFor="pl-fiat-title">Name</Label>
            <Input
              id="pl-fiat-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter payment link name"
              disabled={busy}
            />
          </section>

          {needsCountrySelection ? (
            <section className="space-y-2">
              <Label htmlFor="pl-fiat-country">Business country</Label>
              <p className="text-xs text-muted-foreground">
                Select once to set your business operating country and default fiat.
              </p>
              <Select value={selectedCountry} onValueChange={handleCountryChange} disabled={busy}>
                <SelectTrigger id="pl-fiat-country">
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_LINK_COUNTRY_FIAT_OPTIONS.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {option.name} ({option.currency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </section>
          ) : (
            <p className="rounded-md bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Business country: {savedCountryCode}. Default fiat: {" "}
              {resolveFiatCurrencyForCountry(savedCountryCode)}.
            </p>
          )}

          <section className="grid gap-3 sm:grid-cols-[1fr_1.1fr] sm:items-end">
            <PaymentLinkCurrencyPicker
              value={currencyCode}
              onChange={setCurrencyCode}
              chargeKind="FIAT"
              disabled={busy}
              triggerPlaceholder="Search fiat currency"
            />
            <div className="min-w-0 space-y-2">
              <Label htmlFor="pl-fiat-amount">Amount</Label>
              <Input
                id="pl-fiat-amount"
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="w-full min-w-0"
                placeholder={`0.00 ${selectedCountryOption?.currency ?? currencyCode}`}
                disabled={busy}
              />
            </div>
          </section>

          <section className="flex justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <span className="text-sm font-medium">Payment link type</span>
              <p className="text-xs text-muted-foreground">
                One-time links are marked paid after successful settlement.
              </p>
            </div>
            <div className="grid h-fit grid-cols-2 gap-2 rounded-lg border border-border p-1" role="group" aria-label="Link usage">
              <Button
                type="button"
                variant={linkUsage === "unlimited" ? "default" : "ghost"}
                className="h-10 text-sm"
                style={{ backgroundColor: linkUsage === "unlimited" ? PLATFORM_PRIMARY_HEX : "transparent" }}
                disabled={busy}
                onClick={() => setLinkUsage("unlimited")}
              >
                Unlimited use
              </Button>
              <Button
                type="button"
                variant={linkUsage === "onetime" ? "default" : "ghost"}
                className="h-10 text-sm"
                style={{ backgroundColor: linkUsage === "onetime" ? PLATFORM_PRIMARY_HEX : "transparent" }}
                disabled={busy}
                onClick={() => setLinkUsage("onetime")}
              >
                One-time
              </Button>
            </div>
          </section>

          <label className="flex cursor-pointer items-start gap-3 rounded-md bg-background/40 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 rounded border border-input"
              checked={gasSponsorshipEnabled}
              disabled={busy || Boolean(gasToggleDisabledReason)}
              onChange={(event) => setGasSponsorshipEnabled(event.target.checked)}
              aria-describedby="pl-fiat-gas-help"
            />
            <span className="min-w-0 space-y-1">
              <span className="font-medium leading-snug">Sponsor gas for payers on this link</span>
              {gasToggleDisabledReason ? (
                <span id="pl-fiat-gas-help" className="block text-xs leading-relaxed text-muted-foreground">
                  {gasToggleDisabledReason}
                </span>
              ) : null}
            </span>
          </label>

          {visibleError ? (
            <p className="text-sm text-destructive" role="alert">
              {visibleError}
            </p>
          ) : null}

          <DialogFooter>
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="w-full sm:w-auto"
              style={{ backgroundColor: PLATFORM_PRIMARY_HEX }}
              disabled={submitDisabled}
            >
              {busy ? <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> : null}
              {busy ? "Creating..." : "Create fiat link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

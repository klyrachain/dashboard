"use client";

import { useState } from "react";
import { Building2, Plus, Smartphone, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { usePostMerchantPayoutMethodMutation } from "@/store/merchant-api";
import type { MerchantPayoutMethodRow } from "@/types/merchant-api";
import { maskDestination, payoutMethodLabel } from "./merchant-payout-utils";

const METHOD_TYPES = [
  { value: "MOBILE_MONEY", label: "Mobile Money" },
  { value: "BANK_ACCOUNT", label: "Bank account" },
  { value: "CRYPTO_WALLET", label: "Crypto wallet" },
] as const;

function iconForType(type: string) {
  const t = type.toUpperCase();
  if (t.includes("MOBILE")) return Smartphone;
  if (t.includes("CRYPTO")) return Wallet;
  return Building2;
}

type MerchantPayoutDestinationsSectionProps = {
  payoutMethods: MerchantPayoutMethodRow[];
  isLoading: boolean;
  canManage: boolean;
};

export function MerchantPayoutDestinationsSection({
  payoutMethods,
  isLoading,
  canManage,
}: MerchantPayoutDestinationsSectionProps) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>("MOBILE_MONEY");
  const [currency, setCurrency] = useState("GHS");
  const [phone, setPhone] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const [postMethod, { isLoading: saving }] = usePostMerchantPayoutMethodMutation();

  const resetForm = () => {
    setType("MOBILE_MONEY");
    setCurrency("GHS");
    setPhone("");
    setAccountNumber("");
    setBankName("");
    setAccountName("");
    setWalletAddress("");
    setIsPrimary(false);
  };

  const submit = async () => {
    const details: Record<string, string> = {};
    if (type === "MOBILE_MONEY") {
      details.phone = phone.trim();
    } else if (type === "BANK_ACCOUNT") {
      details.accountNumber = accountNumber.trim();
      details.bankName = bankName.trim();
      details.accountName = accountName.trim();
    } else {
      details.address = walletAddress.trim();
    }

    const hasAny = Object.values(details).some((v) => v.length > 0);
    if (!hasAny) return;

    await postMethod({
      type,
      currency: currency.trim().toUpperCase() || "GHS",
      details,
      isPrimary: isPrimary || undefined,
    }).unwrap();
    resetForm();
    setOpen(false);
  };

  return (
    <section aria-labelledby="saved-accounts-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id="saved-accounts-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            Saved Accounts
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            Where we send your money.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!canManage}
          onClick={() => setOpen(true)}
          className="shrink-0 gap-2 w-full sm:w-auto"
        >
          <Plus className="size-4 shrink-0" aria-hidden />
          + Add Account
        </Button>
      </div>

      {isLoading ? (
        <div className="-mx-1 flex gap-4 overflow-x-auto pb-1 px-1">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 min-w-[240px] shrink-0 rounded-lg" />
          ))}
        </div>
      ) : payoutMethods.length === 0 ? (
        <div
          className="rounded-lg border border-dashed px-6 py-10 text-center"
          role="status"
        >
          <p className="text-sm font-medium text-muted-foreground">
            No accounts yet
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
            Add a Mobile Money number or bank account to get started.
          </p>
          {canManage ? (
            <Button
              type="button"
              className="mt-4"
              onClick={() => setOpen(true)}
            >
              + Add Account
            </Button>
          ) : null}
        </div>
      ) : (
        <ul className="-mx-1 flex gap-4 overflow-x-auto pb-1 px-1 snap-x snap-mandatory">
          {payoutMethods.map((m) => {
            const Icon = iconForType(m.type);
            const masked = maskDestination(m.type, m.details);
            return (
              <li key={m.id} className="snap-start min-w-[260px] max-w-xs shrink-0">
                <Card className="h-full bg-card">
                  <CardContent className="px-6 py-6 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="flex size-9 items-center justify-center rounded-md bg-muted">
                          <Icon className="size-4 text-foreground" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">
                            {payoutMethodLabel(m)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {masked}, {m.currency}
                          </p>
                        </div>
                      </div>
                      {m.isPrimary ? (
                        <Badge variant="default" className="shrink-0 text-[10px] uppercase">
                          Primary
                        </Badge>
                      ) : null}
                    </div>
                  </CardContent>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) resetForm();
          setOpen(next);
        }}
      >
        <DialogContent className="max-w-md" showClose aria-describedby="add-payout-desc">
          <DialogHeader>
            <DialogTitle>Add payout account</DialogTitle>
            <DialogDescription id="add-payout-desc">
              Enter details as they appear with your bank or Mobile Money
              provider. We verify the account name when your provider supports
              it.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="pm-type">Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger id="pm-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHOD_TYPES.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pm-currency">Currency</Label>
              <Input
                id="pm-currency"
                autoComplete="off"
                placeholder="GHS"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
              />
            </div>
            {type === "MOBILE_MONEY" ? (
              <div className="grid gap-2">
                <Label htmlFor="pm-phone">Mobile Money number</Label>
                <Input
                  id="pm-phone"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="+233…"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            ) : null}
            {type === "BANK_ACCOUNT" ? (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="pm-bank">Bank name</Label>
                  <Input
                    id="pm-bank"
                    autoComplete="organization"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pm-acc">Account number</Label>
                  <Input
                    id="pm-acc"
                    inputMode="numeric"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="pm-name">Account name (as on statement)</Label>
                  <Input
                    id="pm-name"
                    autoComplete="name"
                    value={accountName}
                    onChange={(e) => setAccountName(e.target.value)}
                  />
                </div>
              </>
            ) : null}
            {type === "CRYPTO_WALLET" ? (
              <div className="grid gap-2">
                <Label htmlFor="pm-wallet">Wallet address</Label>
                <Input
                  id="pm-wallet"
                  autoComplete="off"
                  className="font-mono text-xs"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                />
              </div>
            ) : null}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pm-primary"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="size-4 rounded border-input"
              />
              <Label htmlFor="pm-primary" className="font-normal text-sm">
                Set as primary destination
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={saving} onClick={() => void submit()}>
              {saving ? "Saving…" : "Save account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { usePostMerchantSettlementWithdrawMutation } from "@/store/merchant-api";
import type { MerchantPayoutMethodRow } from "@/types/merchant-api";
import {
  formatMoneyAmount,
  parseAmountString,
  payoutMethodLabel,
} from "./merchant-payout-utils";

type MerchantWithdrawFundsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payoutMethods: MerchantPayoutMethodRow[];
  defaultCurrency: string;
  /** Optional: fee as fraction (e.g. 0.005 for 0.5%). */
  withdrawalFeeRate?: number;
  /** When set, "Withdraw max" fills this amount for the matching currency. */
  maxAvailableByCurrency?: Record<string, number>;
};

export function MerchantWithdrawFundsDialog({
  open,
  onOpenChange,
  payoutMethods,
  defaultCurrency,
  withdrawalFeeRate = 0,
  maxAvailableByCurrency,
}: MerchantWithdrawFundsDialogProps) {
  const [withdraw, { isLoading }] = usePostMerchantSettlementWithdrawMutation();
  const [amount, setAmount] = useState("");
  const [methodId, setMethodId] = useState<string>("");

  const resolvedMethodId = methodId || payoutMethods[0]?.id || "";

  const selected = useMemo(
    () => payoutMethods.find((m) => m.id === resolvedMethodId),
    [payoutMethods, resolvedMethodId]
  );

  const currency = selected?.currency ?? defaultCurrency;

  const parsedAmount = parseAmountString(amount);
  const feeAmount = withdrawalFeeRate > 0 ? parsedAmount * withdrawalFeeRate : 0;
  const netAmount = Math.max(0, parsedAmount - feeAmount);

  const reset = () => {
    setAmount("");
    setMethodId("");
  };

  const handleWithdrawMax = () => {
    const cap = maxAvailableByCurrency?.[currency];
    if (cap != null && cap > 0) {
      setAmount(cap.toFixed(2));
    }
  };

  const submit = async () => {
    if (!resolvedMethodId || parsedAmount <= 0) {
      return;
    }
    try {
      await withdraw({
        amount: String(parsedAmount),
        currency,
        payoutMethodId: resolvedMethodId,
      }).unwrap();
      reset();
      onOpenChange(false);
    } catch {
      /* baseQueryWithStatus surfaces API error */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md" aria-describedby="withdraw-desc">
        <DialogHeader>
          <DialogTitle>Withdraw funds</DialogTitle>
          <DialogDescription id="withdraw-desc">
            Choose an amount and where to send it. We show fees and what you
            receive before you confirm.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="withdraw-amount">Amount</Label>
            <div className="flex gap-2">
              <Input
                id="withdraw-amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-describedby="withdraw-currency-hint"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0"
                onClick={handleWithdrawMax}
              >
                Withdraw max
              </Button>
            </div>
            <p id="withdraw-currency-hint" className="text-xs text-muted-foreground">
              Currency follows the destination account ({currency}).
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="withdraw-destination">Destination</Label>
            <Select value={resolvedMethodId} onValueChange={setMethodId}>
              <SelectTrigger id="withdraw-destination">
                <SelectValue placeholder="Choose account" />
              </SelectTrigger>
              <SelectContent>
                {payoutMethods.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {payoutMethodLabel(m)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <section
            className="rounded-lg border bg-muted/30 p-4 space-y-2 text-sm"
            aria-labelledby="withdraw-summary-heading"
          >
            <h3 id="withdraw-summary-heading" className="font-medium text-foreground">
              Summary
            </h3>
            <dl className="space-y-2">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Gross amount</dt>
                <dd className="tabular-nums font-medium">
                  {formatMoneyAmount(parsedAmount, currency)}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Withdrawal fee</dt>
                <dd className="tabular-nums">
                  {withdrawalFeeRate > 0
                    ? formatMoneyAmount(feeAmount, currency)
                    : "None"}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-t pt-2 font-semibold">
                <dt>Net to your account</dt>
                <dd className="tabular-nums">
                  {formatMoneyAmount(netAmount, currency)}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-muted-foreground">
              Rates and fees are set when we send the transfer. If no fee
              appears here, your plan may bill separately. Contact support with
              questions.
            </p>
          </section>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={
              isLoading ||
              payoutMethods.length === 0 ||
              parsedAmount <= 0 ||
              !resolvedMethodId
            }
            onClick={() => void submit()}
          >
            {isLoading ? "Submitting…" : "Confirm withdrawal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

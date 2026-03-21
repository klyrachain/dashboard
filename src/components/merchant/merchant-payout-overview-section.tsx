"use client";

import { format, parseISO } from "date-fns";
import { Wallet, Landmark, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { MerchantSummary } from "@/types/merchant-api";
import {
  buildPayoutOverviewFromSummary,
  formatMoneyAmount,
} from "./merchant-payout-utils";

type MerchantPayoutOverviewSectionProps = {
  summary: MerchantSummary | null | undefined;
  isLoading: boolean;
  onWithdraw: () => void;
  canWithdraw: boolean;
};

const EMPTY_AMOUNT = "Nothing yet";

function formatCurrencyMap(
  amounts: Record<string, number>,
  emptyLabel: string
): string {
  const entries = Object.entries(amounts).filter(([, n]) => n > 0);
  if (entries.length === 0) return emptyLabel;
  return entries
    .map(([c, n]) => formatMoneyAmount(n, c))
    .join(", ");
}

function shouldShowNextPayoutCard(
  schedule: MerchantSummary["payoutSchedule"] | undefined
): boolean {
  if (!schedule) return false;
  if (schedule.nextRunAt) return true;
  const c = schedule.cadence;
  if (c == null) return false;
  return String(c).toUpperCase() !== "MANUAL";
}

export function MerchantPayoutOverviewSection({
  summary,
  isLoading,
  onWithdraw,
  canWithdraw,
}: MerchantPayoutOverviewSectionProps) {
  if (isLoading) {
    return (
      <section aria-labelledby="payout-overview-heading" className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-44" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      </section>
    );
  }

  const figures = buildPayoutOverviewFromSummary(summary);
  const schedule = summary?.payoutSchedule;
  const showNextPayout = shouldShowNextPayoutCard(schedule);

  let nextBatchLabel = "";
  if (schedule?.nextRunAt) {
    try {
      const d = parseISO(schedule.nextRunAt);
      nextBatchLabel = `Next: ${format(d, "MMM d, yyyy, HH:mm")}`;
      if (schedule.timezone) {
        nextBatchLabel += ` (${schedule.timezone})`;
      }
    } catch {
      nextBatchLabel = `Next: ${schedule.nextRunAt}`;
    }
  } else if (schedule?.cadence) {
    nextBatchLabel = String(schedule.cadence).toLowerCase();
  }

  const fiatAvailableStr = formatCurrencyMap(
    figures.availableByCurrency,
    EMPTY_AMOUNT
  );
  const fiatPendingStr = formatCurrencyMap(
    figures.pendingByCurrency,
    EMPTY_AMOUNT
  );
  const lifetimeStr = formatCurrencyMap(
    figures.lifetimePaidOutByCurrency,
    EMPTY_AMOUNT
  );

  return (
    <section aria-labelledby="payout-overview-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="payout-overview-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            Your Balances
          </h2>
        </div>
        <Button
          type="button"
          size="lg"
          className="shrink-0 font-semibold w-full sm:w-auto"
          onClick={onWithdraw}
          disabled={!canWithdraw}
        >
          Withdraw funds
        </Button>
      </div>

      <div
        className={cn(
          "grid gap-4 sm:grid-cols-2",
          showNextPayout ? "lg:grid-cols-4" : "lg:grid-cols-3"
        )}
      >
        <Card className="bg-card">
          <CardHeader className="space-y-0 px-6 pt-6 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Landmark className="size-4 shrink-0" aria-hidden />
              Available
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {fiatAvailableStr}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Ready to withdraw right now.
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card">
          <CardHeader className="space-y-0 px-6 pt-6 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Wallet className="size-4 shrink-0" aria-hidden />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {fiatPendingStr}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Processing and on the way to your account.
            </p>
          </CardContent>
        </Card>
        {showNextPayout ? (
          <Card className="bg-card">
            <CardHeader className="space-y-0 px-6 pt-6 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <CalendarClock className="size-4 shrink-0" aria-hidden />
                Next payout
              </CardTitle>
            </CardHeader>
            <CardContent className="px-6 pb-6">
              <p className="text-sm font-semibold leading-snug">
                {nextBatchLabel || "Scheduled"}
              </p>
            </CardContent>
          </Card>
        ) : null}
        <Card className="bg-card">
          <CardHeader className="space-y-0 px-6 pt-6 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total withdrawn
            </CardTitle>
          </CardHeader>
          <CardContent className="px-6 pb-6">
            <p className="text-xl font-semibold tabular-nums tracking-tight">
              {lifetimeStr}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              All time funds sent to your accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

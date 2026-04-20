"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMerchantRole } from "@/hooks/use-merchant-role";
import { canManagePayoutMethods } from "@/lib/merchant-rbac";
import {
  useGetMerchantPayoutMethodsQuery,
  useGetMerchantSettlementsQuery,
  useGetMerchantSummaryQuery,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import { MerchantPayoutDestinationsSection } from "./merchant-payout-destinations-section";
import { MerchantPayoutHistorySection } from "./merchant-payout-history-section";
import { MerchantPayoutOverviewSection } from "./merchant-payout-overview-section";
import { buildPayoutOverviewFromSummary } from "./merchant-payout-utils";
import { MerchantWithdrawFundsDialog } from "./merchant-withdraw-funds-dialog";

export function MerchantSettlementsClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();
  const role = useMerchantRole();
  const canFinance = canManagePayoutMethods(role);

  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const statusFilter = searchParams.get("status") ?? "all";

  const [withdrawOpen, setWithdrawOpen] = useState(false);

  const summaryQ = useGetMerchantSummaryQuery(
    { days: 90, seriesDays: 14, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );

  const payoutMethodsQ = useGetMerchantPayoutMethodsQuery(undefined, {
    skip: skipMerchantApi,
  });

  const listQ = useGetMerchantSettlementsQuery(
    {
      page,
      limit: 20,
      merchantApiScopeKey,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    },
    { skip: skipMerchantApi }
  );

  const pushParams = (next: Record<string, string | undefined>) => {
    const u = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v === undefined || v === "") u.delete(k);
      else u.set(k, v);
    }
    router.push(`/settlements?${u.toString()}`);
  };

  const figures = useMemo(
    () => buildPayoutOverviewFromSummary(summaryQ.data ?? null),
    [summaryQ.data]
  );

  const defaultCurrency = useMemo(() => {
    const fromAvail = Object.keys(figures.availableByCurrency)[0];
    if (fromAvail) return fromAvail;
    const m = payoutMethodsQ.data?.[0]?.currency;
    return m ?? "GHS";
  }, [figures.availableByCurrency, payoutMethodsQ.data]);

  const maxAvailableByCurrency = figures.availableByCurrency;

  if (!effectiveBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to view payouts for that tenant.
      </p>
    );
  }

  if (listQ.isError) {
    const err = listQ.error;
    const msg =
      err && typeof err === "object" && "status" in err
        ? `Could not load payouts (${String((err as { status: unknown }).status)}).`
        : "Could not load payouts.";
    return (
      <div
        className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        {msg} Check your connection and portal session.
      </div>
    );
  }

  const items = listQ.data?.items ?? [];
  const meta = listQ.data?.meta ?? { page: 1, limit: 20, total: 0 };
  const payoutMethods = payoutMethodsQ.data ?? [];

  const canWithdraw = canFinance && payoutMethods.length > 0;

  return (
    <div className="space-y-8">
      <MerchantPayoutOverviewSection
        summary={summaryQ.data ?? null}
        isLoading={summaryQ.isLoading || summaryQ.isFetching}
        onWithdraw={() => setWithdrawOpen(true)}
        canWithdraw={canWithdraw}
      />

      {payoutMethodsQ.isError ? (
        <div
          className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-900 dark:text-amber-200"
          role="status"
        >
          Could not load payout destinations. You can still review payout history.
        </div>
      ) : null}

      <MerchantPayoutDestinationsSection
        payoutMethods={payoutMethods}
        isLoading={payoutMethodsQ.isLoading || payoutMethodsQ.isFetching}
        canManage={canFinance}
      />

      <MerchantPayoutHistorySection
        items={items as Record<string, unknown>[]}
        meta={meta}
        page={page}
        statusFilter={statusFilter}
        isLoading={
          (listQ.isLoading && !listQ.data) ||
          (listQ.isFetching && items.length === 0)
        }
        onStatusChange={(value) => {
          pushParams({
            status: value === "all" ? undefined : value,
            page: "1",
          });
        }}
        onPageChange={(nextPage) => {
          pushParams({ page: String(nextPage) });
        }}
      />

      <MerchantWithdrawFundsDialog
        open={withdrawOpen}
        onOpenChange={setWithdrawOpen}
        payoutMethods={payoutMethods}
        defaultCurrency={defaultCurrency}
        maxAvailableByCurrency={maxAvailableByCurrency}
        withdrawalFeeRate={0}
      />
    </div>
  );
}

import { Suspense } from "react";
import { BalancesContentClient } from "./balances-content-client";
import { BalancesSkeleton } from "@/components/balances/balances-skeleton";
import {
  getPendingState,
  getClaimableState,
  getRecentBalanceActivity,
} from "@/lib/data-balances";

export default async function BalancesPage() {
  const [pending, claimable, recentActivity] = await Promise.all([
    getPendingState(),
    getClaimableState(),
    getRecentBalanceActivity(),
  ]);

  return (
    <Suspense fallback={<BalancesSkeleton />}>
      <BalancesContentClient
        pending={pending}
        claimable={claimable}
        recentActivity={recentActivity}
      />
    </Suspense>
  );
}

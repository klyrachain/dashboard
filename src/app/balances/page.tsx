import { Suspense } from "react";
import { BalancesContentClient } from "./balances-content-client";
import { BalancesSkeleton } from "@/components/balances/balances-skeleton";
import {
  getPendingState,
  getClaimableState,
  getRecentBalanceActivity,
} from "@/lib/data-balances";
import { getAccessContext } from "@/lib/data-access";

export default async function BalancesPage() {
  const [pending, claimable, recentActivity, access] = await Promise.all([
    getPendingState(),
    getClaimableState(),
    getRecentBalanceActivity(),
    getAccessContext(),
  ]);
  const isMerchant = Boolean(access.ok && access.context?.type === "merchant");

  return (
    <Suspense fallback={<BalancesSkeleton />}>
      <BalancesContentClient
        pending={pending}
        claimable={claimable}
        recentActivity={recentActivity}
        isMerchant={isMerchant}
        pageTitle={"Balances"}
        pageDescription={
          isMerchant
            ? "Payout balances, commerce volume, and recorded tokens."
            : "Real-time overview of assets across all chains and liquidity pools."
        }
      />
    </Suspense>
  );
}

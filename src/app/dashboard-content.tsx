import { DashboardVolumeSection } from "@/components/dashboard/dashboard-volume-section";
import { DashboardPlatformOverview } from "@/components/dashboard/dashboard-platform-overview";
import { DashboardInventoryAndGlance } from "@/components/dashboard/dashboard-inventory-and-glance";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { DashboardMerchantOverview } from "@/components/dashboard/dashboard-merchant-overview";
import { ApiKeysCard } from "@/components/dashboard/api-keys-card";
import { RecommendationsBanner } from "@/components/dashboard/recommendations-banner";
import { getRecentTransactions } from "@/lib/data";
import {
  getPlatformOverview,
  type PlatformOverview,
} from "@/lib/data-platform";
import {
  stripeApiKeys,
  stripeRecommendations,
} from "@/lib/data-stripe-dashboard";
import { getAccessContext } from "@/lib/data-access";

export async function DashboardContent() {
  const access = await getAccessContext();
  const isMerchant = Boolean(access.ok && access.context?.type === "merchant");

  let recentTransactions: Awaited<ReturnType<typeof getRecentTransactions>> =
    [];
  let platformData: PlatformOverview | null = null;
  let platformError: string | null = null;

  if (!isMerchant) {
    const [tx, platformResult] = await Promise.all([
      getRecentTransactions(5),
      getPlatformOverview(),
    ]);
    recentTransactions = tx;
    if (platformResult.ok) {
      platformData = platformResult.data;
    } else {
      platformError = platformResult.error ?? null;
    }
  }

  return (
    <div className="space-y-8 font-primary text-body">
      {isMerchant ? (
        <header className="space-y-1">
          <h1 className="text-display font-semibold tracking-tight">Dashboard</h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            Your sales, volume, and payouts in one place.
          </p>
        </header>
      ) : null}
      {!isMerchant ? <DashboardVolumeSection /> : null}

      {!isMerchant ? (
        <DashboardPlatformOverview data={platformData} error={platformError} />
      ) : (
        <DashboardMerchantOverview />
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {!isMerchant ? <DashboardInventoryAndGlance /> : null}
          {!isMerchant ? (
            <DashboardRecentActivity transactions={recentTransactions} />
          ) : null}
        </div>

        {!isMerchant ? (
          <div className="space-y-8">
            <ApiKeysCard rows={stripeApiKeys} />
            <RecommendationsBanner recommendations={stripeRecommendations} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

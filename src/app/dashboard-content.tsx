import { DashboardVolumeSection } from "@/components/dashboard/dashboard-volume-section";
import { DashboardPlatformOverview } from "@/components/dashboard/dashboard-platform-overview";
import { DashboardInventoryAndGlance } from "@/components/dashboard/dashboard-inventory-and-glance";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { ApiKeysCard } from "@/components/dashboard/api-keys-card";
import { RecommendationsBanner } from "@/components/dashboard/recommendations-banner";
import { getRecentTransactions } from "@/lib/data";
import { getPlatformOverview } from "@/lib/data-platform";
import {
  stripeApiKeys,
  stripeRecommendations,
} from "@/lib/data-stripe-dashboard";
import { getAccessContext } from "@/lib/data-access";

export async function DashboardContent() {
  const access = await getAccessContext();
  const isMerchant = Boolean(access.ok && access.context?.type === "merchant");

  const [recentTransactions, platformResult] = await Promise.all([
    getRecentTransactions(5),
    getPlatformOverview(),
  ]);
  const platformData = platformResult.ok ? platformResult.data : null;
  const platformError = platformResult.ok ? null : platformResult.error;

  return (
    <div className="space-y-8">
      <DashboardVolumeSection />

      {!isMerchant ? (
        <DashboardPlatformOverview data={platformData} error={platformError} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {!isMerchant ? <DashboardInventoryAndGlance /> : null}
          <DashboardRecentActivity transactions={recentTransactions} />
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

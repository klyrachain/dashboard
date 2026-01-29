import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { HeroVolumeCards } from "@/components/dashboard/hero-volume-cards";
import { DashboardInventoryAndGlance } from "@/components/dashboard/dashboard-inventory-and-glance";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { ApiKeysCard } from "@/components/dashboard/api-keys-card";
import { RecommendationsBanner } from "@/components/dashboard/recommendations-banner";
import { getDashboardKpis } from "@/lib/data-dashboard";
import { getRecentTransactions } from "@/lib/data";
import {
  getGrossVolumeChartData,
  getNetVolumeChartData,
  stripeApiKeys,
  stripeRecommendations,
  stripePreviousPeriod,
  stripeVolumeUpdatedAt,
} from "@/lib/data-stripe-dashboard";

export async function DashboardContent() {
  const [kpis, recentTransactions] = await Promise.all([
    getDashboardKpis(),
    getRecentTransactions(5),
  ]);

  const grossValue = kpis.volumeWeek || "0.00";
  const netValue = kpis.volumeDay || "0.00";

  return (
    <div className="space-y-8">
      <DashboardHeader />

      <HeroVolumeCards
        grossValue={grossValue}
        netValue={netValue}
        grossChartData={getGrossVolumeChartData()}
        netChartData={getNetVolumeChartData()}
        updatedAt={stripeVolumeUpdatedAt}
        grossPrevious={stripePreviousPeriod.gross}
        netPrevious={stripePreviousPeriod.net}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          <DashboardInventoryAndGlance />
          <DashboardRecentActivity transactions={recentTransactions} />
        </div>

        <div className="space-y-8">
          <ApiKeysCard rows={stripeApiKeys} />
          <RecommendationsBanner recommendations={stripeRecommendations} />
        </div>
      </div>
    </div>
  );
}

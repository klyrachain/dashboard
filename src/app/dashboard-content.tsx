import { DashboardVolumeSection } from "@/components/dashboard/dashboard-volume-section";
import { DashboardInventoryAndGlance } from "@/components/dashboard/dashboard-inventory-and-glance";
import { DashboardRecentActivity } from "@/components/dashboard/dashboard-recent-activity";
import { ApiKeysCard } from "@/components/dashboard/api-keys-card";
import { RecommendationsBanner } from "@/components/dashboard/recommendations-banner";
import { getRecentTransactions } from "@/lib/data";
import {
  stripeApiKeys,
  stripeRecommendations,
} from "@/lib/data-stripe-dashboard";

export async function DashboardContent() {
  const recentTransactions = await getRecentTransactions(5);

  return (
    <div className="space-y-8">
      <DashboardVolumeSection />

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

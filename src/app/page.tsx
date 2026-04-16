import { Suspense } from "react";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HomePortalGate } from "@/components/business-auth/home-portal-gate";

export default function DashboardPage() {
  return (
    <>
      <Suspense fallback={null}>
        <HomePortalGate />
      </Suspense>
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </>
  );
}

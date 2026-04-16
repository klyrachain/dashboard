import { Suspense } from "react";
import { redirect } from "next/navigation";
import { DashboardContent } from "./dashboard-content";
import { DashboardSkeleton } from "@/components/dashboard/dashboard-skeleton";
import { HomePortalGate } from "@/components/business-auth/home-portal-gate";
import { getSessionToken } from "@/lib/auth";
import { isMerchantPortalSessionReady } from "@/lib/data-access";
import { businessSignInHref } from "@/lib/business-portal-urls";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Belt-and-suspenders with middleware: if `/` is ever served without auth (e.g. matcher quirks),
 * never render the dashboard shell — send visitors to business sign-in.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const loginCodeRaw = params.login_code;
  const loginCode =
    typeof loginCodeRaw === "string"
      ? loginCodeRaw
      : Array.isArray(loginCodeRaw)
        ? loginCodeRaw[0]
        : undefined;

  if (loginCode?.trim()) {
    return <DashboardHomeBody />;
  }

  const adminToken = await getSessionToken();
  if (adminToken) {
    return <DashboardHomeBody />;
  }

  if (await isMerchantPortalSessionReady()) {
    return <DashboardHomeBody />;
  }

  redirect(businessSignInHref("/"));
}

function DashboardHomeBody() {
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

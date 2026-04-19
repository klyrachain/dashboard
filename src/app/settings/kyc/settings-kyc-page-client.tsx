"use client";

import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { PortalKycClient } from "@/components/settings/portal-kyc-client";
import { PortalKybClient } from "@/components/settings/portal-kyb-client";

function SettingsKycFlow() {
  const searchParams = useSearchParams();
  const flow = useMemo(() => searchParams.get("flow")?.trim().toLowerCase() ?? "", [searchParams]);
  if (flow === "kyb") {
    return <PortalKybClient />;
  }
  return <PortalKycClient />;
}

export function SettingsKycPageClient() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground font-primary" aria-busy>
          Loading…
        </div>
      }
    >
      <SettingsKycFlow />
    </Suspense>
  );
}

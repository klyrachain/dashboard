import { Suspense } from "react";
import { PortalKycClient } from "@/components/settings/portal-kyc-client";

export default function SettingsKycPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground font-primary" aria-busy>
          Loading…
        </div>
      }
    >
      <PortalKycClient />
    </Suspense>
  );
}

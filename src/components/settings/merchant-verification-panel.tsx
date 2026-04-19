"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useGetMerchantBusinessQuery } from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKybLabel } from "@/lib/kyb-status";

function isPortalKycApproved(
  status: string | null | undefined,
  verifiedAt: string | null | undefined
): boolean {
  if (verifiedAt) return true;
  const t = (status ?? "").trim().toLowerCase();
  return t === "approved";
}

export function MerchantVerificationPanel() {
  const { skipMerchantApi } = useMerchantTenantScope();
  const { data, isLoading, isError, refetch } = useGetMerchantBusinessQuery(undefined, {
    skip: skipMerchantApi,
  });

  const kycDone = useMemo(
    () =>
      isPortalKycApproved(data?.portalKycStatus ?? undefined, data?.portalKycVerifiedAt ?? undefined),
    [data?.portalKycStatus, data?.portalKycVerifiedAt]
  );

  const showKyb = data?.isFirstActiveMember === true;
  const kybLabel = formatKybLabel(data?.kybStatus);

  if (skipMerchantApi) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to view verification status.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-24 w-full" />
        {showKyb ? <Skeleton className="h-20 w-full" /> : null}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
        Could not load verification status.{" "}
        <button type="button" className="underline font-medium" onClick={() => void refetch()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Personal verification (KYC)</CardTitle>
          <CardDescription>
            Every member completes their own identity check. Status for your account on this business.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium">{kycDone ? "Verified" : "Not verified"}</span>
            {!kycDone && data.portalKycStatus ? (
              <span className="text-muted-foreground"> ({data.portalKycStatus})</span>
            ) : null}
          </p>
          {!kycDone ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground max-w-prose">
                Open the verification link from your invite email, or ask a business admin to resend it.
                Your team can track progress here once verification has started.
              </p>
              <Button asChild type="button" variant="secondary">
                <Link href="/login">Sign in</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {showKyb ? (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>Company verification (KYB)</CardTitle>
            <CardDescription>
              As the founding member for this business, you complete company verification when the business
              is ready — usually from Business profile, not immediately after signup.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className="font-medium">{kybLabel}</span>
            </p>
            {data.kybStatus !== "APPROVED" ? (
              <Button asChild type="button" variant="outline">
                <Link href="/settings/general">Open business profile</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

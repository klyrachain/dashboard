"use client";

import Link from "next/link";
import { useMemo } from "react";
import { format } from "date-fns";
import { useGetMerchantBusinessQuery } from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

function kycBadgeVariant(
  approved: boolean,
  status: string | null | undefined
): "success" | "secondary" | "destructive" | "outline" {
  if (approved) return "success";
  const s = (status ?? "").toUpperCase();
  if (s.includes("REJECT") || s.includes("DECLIN") || s === "FAILED") return "destructive";
  if (s.includes("PEND") || s.includes("SUBMIT") || s.includes("REVIEW") || s.includes("PROCESS"))
    return "secondary";
  return "outline";
}

function kybBadgeVariant(status: string | undefined): "success" | "secondary" | "destructive" | "outline" {
  const s = (status ?? "NOT_STARTED").toUpperCase().replace(/ /g, "_");
  if (s === "APPROVED") return "success";
  if (s === "PENDING") return "secondary";
  if (s === "REJECTED" || s === "RESTRICTED") return "destructive";
  return "outline";
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
  const kycStatusLabel =
    data?.portalKycStatus?.trim() ||
    (kycDone ? "Approved" : "Not started");

  const supportEmail = data?.supportEmail?.trim();
  const supportUrl = data?.supportUrl?.trim();

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
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-24 w-full" />
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
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Personal verification (KYC)</CardTitle>
              <CardDescription>
                Each member completes their own identity check for this workspace.
              </CardDescription>
            </div>
            <Badge variant={kycBadgeVariant(kycDone, data.portalKycStatus)}>
              {kycDone ? "Verified" : kycStatusLabel}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {kycDone && data.portalKycVerifiedAt ? (
            <p className="text-sm text-muted-foreground">
              Completed{" "}
              <span className="font-medium text-foreground">
                {format(new Date(data.portalKycVerifiedAt), "MMM d, yyyy")}
              </span>
              {data.portalKycProvider ? (
                <span className="text-muted-foreground"> · Provider: {data.portalKycProvider}</span>
              ) : null}
            </p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground max-w-prose">
                Start or continue verification using the secure link from your invite or reminder email.
                If you did not receive one, ask a business owner to resend your invite, or use the options
                below.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild type="button">
                  <Link href="/settings/team">Team & invites</Link>
                </Button>
                {supportUrl ? (
                  <Button asChild type="button" variant="outline">
                    <a href={supportUrl} target="_blank" rel="noopener noreferrer">
                      Help center
                    </a>
                  </Button>
                ) : null}
                {supportEmail ? (
                  <Button asChild type="button" variant="outline">
                    <a
                      href={`mailto:${supportEmail}?subject=${encodeURIComponent("Verification help")}`}
                    >
                      Email support
                    </a>
                  </Button>
                ) : null}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle>Company verification (KYB)</CardTitle>
              <CardDescription>
                {showKyb
                  ? "As the founding team lead for this business, you submit company details when your organization is ready."
                  : "Company verification is submitted by your business’s founding team lead. Everyone can see the current status below."}
              </CardDescription>
            </div>
            <Badge variant={kybBadgeVariant(data.kybStatus)}>{kybLabel}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {showKyb ? (
            <>
              {data.kybStatus !== "APPROVED" ? (
                <div className="flex flex-wrap gap-2">
                  <Button asChild type="button">
                    <Link href="/settings/general">Continue in business profile</Link>
                  </Button>
                  <Button asChild type="button" variant="outline">
                    <Link href="/settings/team">Team & invites</Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your company verification is approved. Update legal or contact details anytime from
                  business profile.
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground max-w-prose">
              You are not the founding member who files KYB. If this status should move forward, ask
              that person to open{" "}
              <Link href="/settings/general" className="font-medium text-primary underline">
                Business profile
              </Link>{" "}
              or contact them via{" "}
              <Link href="/settings/team" className="font-medium text-primary underline">
                Team & invites
              </Link>
              .
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

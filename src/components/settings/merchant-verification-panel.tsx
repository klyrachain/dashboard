"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

const KYC_FLOW_STARTED_KEY_PREFIX = "klyra_merchant_kyc_started:";
const KYB_FLOW_STARTED_KEY_PREFIX = "klyra_merchant_kyb_started:";

/** True when Core shows a real in-flight / terminal-in-progress state (not blank / not-started). */
function portalKycStatusImpliesContinue(
  status: string | null | undefined,
  verifiedAt: string | null | undefined
): boolean {
  if (isPortalKycApproved(status, verifiedAt)) return false;
  const s = (status ?? "").trim();
  if (!s) return false;
  const u = s.toUpperCase().replace(/ /g, "_");
  if (u === "NOT_STARTED" || u === "NONE") return false;
  return true;
}

/** True when KYB is in progress or needs follow-up (not clean-slate not-started). */
function kybStatusImpliesContinue(status: string | null | undefined): boolean {
  const u = (status ?? "").trim().toUpperCase();
  if (!u || u === "NOT_STARTED") return false;
  if (u === "APPROVED" || u === "RESTRICTED") return false;
  return true;
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

  const kybDone = useMemo(
    () => (data?.kybStatus ?? "").trim().toUpperCase() === "APPROVED",
    [data?.kybStatus]
  );

  const showKyb = data?.isFirstActiveMember === true;
  const kybLabel = formatKybLabel(data?.kybStatus);
  const kycStatusLabel =
    data?.portalKycStatus?.trim() ||
    (kycDone ? "Approved" : "Not started");

  const supportEmail = data?.supportEmail?.trim();
  const supportUrl = data?.supportUrl?.trim();

  const kycFlowStorageKey = `${KYC_FLOW_STARTED_KEY_PREFIX}${data?.id ?? ""}`;
  const kybFlowStorageKey = `${KYB_FLOW_STARTED_KEY_PREFIX}${data?.id ?? ""}`;
  const [openedKycFlow, setOpenedKycFlow] = useState(false);
  const [openedKybFlow, setOpenedKybFlow] = useState(false);

  useEffect(() => {
    if (!data?.id) return;
    queueMicrotask(() => {
      try {
        setOpenedKycFlow(sessionStorage.getItem(kycFlowStorageKey) === "1");
      } catch {
        setOpenedKycFlow(false);
      }
      try {
        setOpenedKybFlow(sessionStorage.getItem(kybFlowStorageKey) === "1");
      } catch {
        setOpenedKybFlow(false);
      }
    });
  }, [data?.id, kycFlowStorageKey, kybFlowStorageKey]);

  useEffect(() => {
    if (!data?.id || !kycDone) return;
    try {
      sessionStorage.removeItem(kycFlowStorageKey);
    } catch {
      /* ignore */
    }
  }, [data?.id, kycDone, kycFlowStorageKey]);

  useEffect(() => {
    if (!data?.id || !kybDone) return;
    try {
      sessionStorage.removeItem(kybFlowStorageKey);
    } catch {
      /* ignore */
    }
  }, [data?.id, kybDone, kybFlowStorageKey]);

  const showContinueKyc =
    openedKycFlow ||
    portalKycStatusImpliesContinue(data?.portalKycStatus ?? undefined, data?.portalKycVerifiedAt ?? undefined);

  const showContinueKyb =
    openedKybFlow || kybStatusImpliesContinue(data?.kybStatus ?? undefined);

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
            </p>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Button asChild type="button">
                  <Link href="/settings/kyc">{showContinueKyc ? "Continue KYC" : "Start KYC"}</Link>
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
                    <Link href="/settings/kyc?flow=kyb">
                      {showContinueKyb ? "Continue company verification" : "Verify your business"}
                    </Link>
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
              <Link href="/settings/kyc?flow=kyb" className="font-medium text-primary underline">
                Company verification
              </Link>{" "}
              from their account to continue.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

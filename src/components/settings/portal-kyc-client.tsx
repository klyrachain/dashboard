"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import { useDispatch } from "react-redux";
import type { AppDispatch } from "@/store";
import { merchantApi } from "@/store/merchant-api";
import { ExternalLink, Loader2, RefreshCw, Shield } from "lucide-react";

const MERCHANT_PREFIX = "/api/v1/merchant";

type KycInitData = {
  provider: string;
  verificationUrl?: string;
  externalId?: string;
  workflowId?: string;
};

type NormalisedKycStatus =
  | "approved"
  | "declined"
  | "in_review"
  | "pending"
  | "resubmitting"
  | null;

function normaliseStatus(raw: string | null | undefined): NormalisedKycStatus {
  if (!raw?.trim()) return null;
  const s = raw.trim().toLowerCase();
  if (s === "approved") return "approved";
  if (s === "declined" || s.includes("declin") || s === "failed") return "declined";
  if (s === "in_review" || s.includes("review")) return "in_review";
  if (s === "resubmitting" || s.includes("resubmit")) return "resubmitting";
  if (s === "pending" || s.includes("pend")) return "pending";
  return "pending";
}

function needsVerificationFlow(status: NormalisedKycStatus): boolean {
  return status === null || status === "pending" || status === "resubmitting";
}

function merchantKycHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const token = getBusinessAccessToken()?.trim();
  const bid = getStoredActiveBusinessId()?.trim();
  const env = getStoredMerchantEnvironment() ?? "LIVE";
  if (token) headers.Authorization = `Bearer ${token}`;
  if (bid) headers["X-Business-Id"] = bid;
  headers["x-merchant-environment"] = env;
  return headers;
}

export function PortalKycClient() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [initData, setInitData] = useState<KycInitData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [callbackSyncError, setCallbackSyncError] = useState<string | null>(null);
  const [callbackSyncing, setCallbackSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<NormalisedKycStatus>(null);
  const [statusRefreshing, setStatusRefreshing] = useState(false);
  const [providerChecking, setProviderChecking] = useState(false);
  const [diditIframeLoaded, setDiditIframeLoaded] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCallbackId = useRef<string | null>(null);

  const invalidateBusiness = useCallback(() => {
    dispatch(merchantApi.util.invalidateTags(["MerchantBusiness"]));
  }, [dispatch]);

  const refreshStatus = useCallback(async (): Promise<NormalisedKycStatus | null> => {
    setStatusRefreshing(true);
    try {
      const res = await fetch(`${MERCHANT_PREFIX}/kyc/status`, {
        credentials: "include",
        headers: merchantKycHeaders(),
      });
      const body = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        data?: {
          portalKycStatus?: string | null;
        };
      };
      const st = normaliseStatus(body.data?.portalKycStatus ?? null);
      setKycStatus(st);
      return st;
    } finally {
      setStatusRefreshing(false);
    }
  }, []);

  const syncWithDidit = useCallback(
    async (verificationSessionId?: string | null): Promise<boolean> => {
      setProviderChecking(true);
      try {
        const res = await fetch(`${MERCHANT_PREFIX}/kyc/sync`, {
          method: "POST",
          credentials: "include",
          headers: merchantKycHeaders(),
          body: JSON.stringify(
            verificationSessionId ? { verificationSessionId } : {}
          ),
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: { portalKycStatus?: string | null };
          error?: string;
        };
        if (res.ok && body.success === true && body.data) {
          const st = normaliseStatus(body.data.portalKycStatus ?? null);
          setKycStatus(st);
          setCallbackSyncError(null);
          invalidateBusiness();
          return true;
        }
        setCallbackSyncError(body.error ?? "Could not sync with the verification provider.");
        return false;
      } finally {
        setProviderChecking(false);
      }
    },
    [invalidateBusiness]
  );

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setInitError(null);
    setCallbackSyncError(null);
    setInitData(null);

    const vSid =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("verificationSessionId")?.trim() ?? null
        : null;
    if (vSid) lastCallbackId.current = vSid;

    try {
      const statusRes = await fetch(`${MERCHANT_PREFIX}/kyc/status`, {
        credentials: "include",
        headers: merchantKycHeaders(),
      });
      const statusBody = (await statusRes.json().catch(() => ({}))) as {
        success?: boolean;
        data?: { portalKycStatus?: string | null };
        error?: string;
        code?: string;
      };

      if (statusRes.status === 401 || statusBody.code === "UNAUTHORIZED") {
        setInitError(statusBody.error ?? "Sign in to the business dashboard to verify your identity.");
        setLoading(false);
        return;
      }

      if (!statusRes.ok || statusBody.success === false) {
        setInitError(statusBody.error ?? "Could not load verification status.");
        setLoading(false);
        return;
      }

      let st = normaliseStatus(statusBody.data?.portalKycStatus ?? null);

      if (vSid && needsVerificationFlow(st)) {
        setCallbackSyncing(true);
        try {
          const ok = await syncWithDidit(vSid);
          if (!ok) {
            setKycStatus(st);
            setLoading(false);
            return;
          }
          st = await refreshStatus();
          lastCallbackId.current = null;
          router.replace("/settings/kyc");
        } finally {
          setCallbackSyncing(false);
        }
      } else if (vSid && !needsVerificationFlow(st)) {
        router.replace("/settings/kyc");
      }

      setKycStatus(st);

      if (!needsVerificationFlow(st)) {
        setLoading(false);
        return;
      }

      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/settings/kyc`
          : undefined;
      const initRes = await fetch(`${MERCHANT_PREFIX}/kyc/init`, {
        method: "POST",
        credentials: "include",
        headers: merchantKycHeaders(),
        body: JSON.stringify(callbackUrl ? { callbackUrl } : {}),
      });
      const initBody = (await initRes.json().catch(() => ({}))) as {
        success?: boolean;
        data?: KycInitData;
        error?: string;
      };
      if (!initRes.ok || initBody.success === false || !initBody.data) {
        setInitError(initBody.error ?? "Failed to start verification. Try again or contact support.");
        setLoading(false);
        return;
      }
      setInitData(initBody.data);
    } catch {
      setInitError("Could not reach the verification service. Check your connection.");
    }
    setLoading(false);
  }, [router, syncWithDidit, refreshStatus]);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (initData?.provider === "didit" && initData.verificationUrl) {
      setDiditIframeLoaded(false);
    }
  }, [initData?.provider, initData?.verificationUrl]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${MERCHANT_PREFIX}/kyc/status`, {
          credentials: "include",
          headers: merchantKycHeaders(),
        });
        const body = (await res.json().catch(() => ({}))) as {
          data?: { portalKycStatus?: string | null };
        };
        const st = normaliseStatus(body.data?.portalKycStatus ?? null);
        setKycStatus(st);
        if (st === "approved" || st === "declined") {
          if (pollingRef.current) clearInterval(pollingRef.current);
          pollingRef.current = null;
          invalidateBusiness();
        }
      } catch {
        /* keep polling */
      }
    }, 3000);
  }

  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  const showFlow = needsVerificationFlow(kycStatus);
  const isTerminal = kycStatus === "approved" || kycStatus === "declined";

  return (
    <div className="space-y-6 font-primary text-body max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/settings/verification">← Back to verification</Link>
        </Button>
      </div>

      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Identity verification (KYC)</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Complete the provider flow in the secure window below. Your workspace uses the Didit workflow
          configured for business members{initData?.workflowId ? ` (${initData.workflowId})` : ""}.
        </p>
      </header>

      {initError ? (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {initError}
        </div>
      ) : null}

      {callbackSyncError && !initError ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-950">
          <p>{callbackSyncError}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={providerChecking}
              onClick={() =>
                void syncWithDidit(lastCallbackId.current).then((ok) => {
                  if (ok) void bootstrap();
                })
              }
            >
              {providerChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Try again
            </Button>
          </div>
        </div>
      ) : null}

      {!initError && !callbackSyncError && (loading || callbackSyncing) ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground" aria-busy>
          <Loader2 className="h-4 w-4 animate-spin" />
          {callbackSyncing ? "Confirming with provider…" : "Loading…"}
        </div>
      ) : null}

      {!loading && !callbackSyncing && !initError && !showFlow && kycStatus === "approved" ? (
        <div className="flex gap-3 rounded-xl border border-green-600/35 bg-green-600/10 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/15 text-green-700">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your identity check is complete for this workspace.
            </p>
            <Button type="button" className="mt-3" size="sm" asChild>
              <Link href="/settings/verification">Back to verification</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && !callbackSyncing && !initError && !showFlow && kycStatus && kycStatus !== "approved" ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium capitalize">{kycStatus.replace(/_/g, " ")}</p>
          <p className="mt-1 text-muted-foreground">
            If you still need to submit documents, use &quot;Refresh&quot; or start again from verification
            settings.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={statusRefreshing}
              onClick={() => void refreshStatus()}
            >
              {statusRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh status
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/settings/verification">Verification settings</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {!initError &&
      !callbackSyncError &&
      !loading &&
      showFlow &&
      initData?.provider === "didit" &&
      initData.verificationUrl ? (
        <div className="space-y-3">
          {!isTerminal && (
            <>
              <div className="relative min-h-[560px] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
                {!diditIframeLoaded ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-card/95 p-6 text-center">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
                    <p className="text-sm font-medium">Loading verification…</p>
                    <Button type="button" size="sm" asChild>
                      <a
                        href={initData.verificationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2"
                      >
                        <ExternalLink className="h-4 w-4" aria-hidden />
                        Open in new tab
                      </a>
                    </Button>
                  </div>
                ) : null}
                <iframe
                  src={initData.verificationUrl}
                  allow="camera; microphone; fullscreen; autoplay; encrypted-media"
                  className="relative z-0 min-h-[560px] w-full rounded-xl bg-background"
                  title="Identity verification"
                  onLoad={() => {
                    setDiditIframeLoaded(true);
                    startPolling();
                  }}
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Prefer a separate window? Open the provider in a new tab.
                </p>
                <Button type="button" size="sm" variant="outline" className="shrink-0" asChild>
                  <a
                    href={initData.verificationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Open in new tab
                  </a>
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={providerChecking}
                  onClick={() => void syncWithDidit(null).then((ok) => ok && void refreshStatus())}
                >
                  {providerChecking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Check with provider
                </Button>
              </div>
            </>
          )}
        </div>
      ) : null}

      {!initError &&
      !callbackSyncError &&
      !loading &&
      showFlow &&
      initData?.provider === "didit" &&
      !initData.verificationUrl ? (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Missing verification link from provider. Check Core Didit configuration (DIDIT_PORTAL_KYC_WORKFLOW_ID
          or DIDIT_WORKFLOW_ID).
        </div>
      ) : null}
    </div>
  );
}

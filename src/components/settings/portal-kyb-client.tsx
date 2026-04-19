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
import { ChevronLeft, ExternalLink, Loader2, Shield } from "lucide-react";

const MERCHANT_PREFIX = "/api/v1/merchant";

type KybInitData = {
  provider: string;
  verificationUrl?: string;
  externalId?: string;
  workflowId?: string;
};

type KybStatusEnum = "NOT_STARTED" | "PENDING" | "APPROVED" | "REJECTED" | "RESTRICTED";

type KybStatusPayload = {
  kybStatus?: KybStatusEnum | string;
};

function normaliseKybStatus(raw: string | null | undefined): KybStatusEnum {
  const t = (raw ?? "").trim().toUpperCase();
  if (
    t === "NOT_STARTED" ||
    t === "PENDING" ||
    t === "APPROVED" ||
    t === "REJECTED" ||
    t === "RESTRICTED"
  ) {
    return t as KybStatusEnum;
  }
  return "NOT_STARTED";
}

function needsKybVerificationFlow(status: KybStatusEnum): boolean {
  return status === "NOT_STARTED" || status === "PENDING" || status === "REJECTED";
}

function merchantKybHeaders(): HeadersInit {
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

export function PortalKybClient() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const [initData, setInitData] = useState<KybInitData | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [callbackSyncError, setCallbackSyncError] = useState<string | null>(null);
  const [callbackSyncing, setCallbackSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [kybStatus, setKybStatus] = useState<KybStatusEnum>("NOT_STARTED");
  const [providerChecking, setProviderChecking] = useState(false);
  const [diditIframeLoaded, setDiditIframeLoaded] = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCallbackId = useRef<string | null>(null);

  const invalidateBusiness = useCallback(() => {
    dispatch(merchantApi.util.invalidateTags(["MerchantBusiness"]));
  }, [dispatch]);

  const refreshStatus = useCallback(async (): Promise<KybStatusEnum | null> => {
    const res = await fetch(`${MERCHANT_PREFIX}/kyb/status`, {
      credentials: "include",
      headers: merchantKybHeaders(),
    });
    const body = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      data?: KybStatusPayload;
    };
    const st = normaliseKybStatus(body.data?.kybStatus ?? null);
    setKybStatus(st);
    return st;
  }, []);

  const syncWithDidit = useCallback(
    async (verificationSessionId?: string | null): Promise<boolean> => {
      setProviderChecking(true);
      try {
        const res = await fetch(`${MERCHANT_PREFIX}/kyb/sync`, {
          method: "POST",
          credentials: "include",
          headers: merchantKybHeaders(),
          body: JSON.stringify(
            verificationSessionId ? { verificationSessionId } : {}
          ),
        });
        const body = (await res.json().catch(() => ({}))) as {
          success?: boolean;
          data?: KybStatusPayload;
          error?: string;
        };
        if (res.ok && body.success === true && body.data) {
          const st = normaliseKybStatus(body.data.kybStatus ?? null);
          setKybStatus(st);
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
    await Promise.resolve();
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
      const statusRes = await fetch(`${MERCHANT_PREFIX}/kyb/status`, {
        credentials: "include",
        headers: merchantKybHeaders(),
      });
      const statusBody = (await statusRes.json().catch(() => ({}))) as {
        success?: boolean;
        data?: KybStatusPayload;
        error?: string;
        code?: string;
      };

      if (statusRes.status === 401 || statusBody.code === "UNAUTHORIZED") {
        setInitError(statusBody.error ?? "Sign in to the business dashboard to verify your company.");
        setLoading(false);
        return;
      }

      if (!statusRes.ok || statusBody.success === false) {
        setInitError(statusBody.error ?? "Could not load company verification status.");
        setLoading(false);
        return;
      }

      let st = normaliseKybStatus(statusBody.data?.kybStatus ?? null);

      if (vSid && needsKybVerificationFlow(st)) {
        setCallbackSyncing(true);
        try {
          const ok = await syncWithDidit(vSid);
          if (!ok) {
            setKybStatus(st);
            setLoading(false);
            return;
          }
          st = (await refreshStatus()) ?? st;
          lastCallbackId.current = null;
          router.replace("/settings/kyc?flow=kyb");
        } finally {
          setCallbackSyncing(false);
        }
      } else if (vSid && !needsKybVerificationFlow(st)) {
        router.replace("/settings/kyc?flow=kyb");
      }

      setKybStatus(st);

      if (needsKybVerificationFlow(st)) {
        const pulledOk = await syncWithDidit(null);
        if (pulledOk) {
          const refreshed = await refreshStatus();
          if (refreshed != null) {
            st = refreshed;
          }
          if (!needsKybVerificationFlow(st)) {
            setLoading(false);
            return;
          }
        }
      }

      if (!needsKybVerificationFlow(st)) {
        setLoading(false);
        return;
      }

      if (st === "RESTRICTED") {
        setInitError("Company verification is not available for this business status.");
        setLoading(false);
        return;
      }

      const callbackUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/settings/kyc?flow=kyb`
          : undefined;
      const initRes = await fetch(`${MERCHANT_PREFIX}/kyb/init`, {
        method: "POST",
        credentials: "include",
        headers: merchantKybHeaders(),
        body: JSON.stringify(callbackUrl ? { callbackUrl } : {}),
      });
      const initBody = (await initRes.json().catch(() => ({}))) as {
        success?: boolean;
        data?: KybInitData;
        error?: string;
        code?: string;
      };
      if (initRes.status === 403 || initBody.code === "KYB_FORBIDDEN") {
        setInitError(
          initBody.error ??
            "Only the founding team lead can start company verification for this business."
        );
        setLoading(false);
        return;
      }
      if (!initRes.ok || initBody.success === false || !initBody.data) {
        setInitError(initBody.error ?? "Failed to start company verification. Try again or contact support.");
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
    queueMicrotask(() => {
      void bootstrap();
    });
  }, [bootstrap]);

  useEffect(() => {
    const bid = getStoredActiveBusinessId()?.trim();
    if (!bid) return;
    try {
      sessionStorage.setItem(`klyra_merchant_kyb_started:${bid}`, "1");
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (initData?.provider === "didit" && initData.verificationUrl) {
      queueMicrotask(() => setDiditIframeLoaded(false));
    }
  }, [initData?.provider, initData?.verificationUrl]);

  useEffect(() => {
    const onBecameVisible = () => {
      if (typeof document === "undefined" || document.visibilityState !== "visible") return;
      void refreshStatus().then((s) => {
        if (s === "APPROVED" || s === "REJECTED") {
          invalidateBusiness();
        }
      });
    };
    const onWinFocus = () => {
      void refreshStatus().then((s) => {
        if (s === "APPROVED" || s === "REJECTED") {
          invalidateBusiness();
        }
      });
    };
    document.addEventListener("visibilitychange", onBecameVisible);
    window.addEventListener("focus", onWinFocus);
    return () => {
      document.removeEventListener("visibilitychange", onBecameVisible);
      window.removeEventListener("focus", onWinFocus);
    };
  }, [refreshStatus, invalidateBusiness]);

  function startPolling() {
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${MERCHANT_PREFIX}/kyb/status`, {
          credentials: "include",
          headers: merchantKybHeaders(),
        });
        const body = (await res.json().catch(() => ({}))) as {
          data?: KybStatusPayload;
        };
        const st = normaliseKybStatus(body.data?.kybStatus ?? null);
        setKybStatus(st);
        if (st === "APPROVED" || st === "REJECTED") {
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

  const showFlow = needsKybVerificationFlow(kybStatus);
  const isTerminal = kybStatus === "APPROVED" || kybStatus === "REJECTED";

  const iframeMinHeight = "min-h-[calc(560px*1.08)]";

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 font-primary text-body">
      <div className="flex w-full flex-wrap items-center justify-start gap-3">
        <Button type="button" variant="outline" size="sm" asChild>
          <Link href="/settings/verification" className="inline-flex items-center gap-1.5">
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            Back to verification
          </Link>
        </Button>
      </div>

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

      {!loading && !callbackSyncing && !initError && !showFlow && kybStatus === "APPROVED" ? (
        <div className="flex gap-3 rounded-xl border border-green-600/35 bg-green-600/10 px-4 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-600/15 text-green-700">
            <Shield className="h-5 w-5" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Company verified</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your organization&apos;s verification is complete for this workspace.
            </p>
            <Button type="button" className="mt-3" size="sm" asChild>
              <Link href="/settings/verification" className="inline-flex items-center gap-1.5">
                <ChevronLeft className="size-4 shrink-0" aria-hidden />
                Back to verification
              </Link>
            </Button>
          </div>
        </div>
      ) : null}

      {!loading && !callbackSyncing && !initError && !showFlow && kybStatus === "RESTRICTED" ? (
        <div className="rounded-lg border border-border bg-muted/20 px-4 py-3 text-sm">
          <p className="font-medium">Restricted</p>
          <p className="mt-1 text-muted-foreground">
            Company verification cannot proceed for this business. Contact support if you need help.
          </p>
        </div>
      ) : null}

      {!initError &&
      !callbackSyncError &&
      !loading &&
      showFlow &&
      initData?.provider === "didit" &&
      initData.verificationUrl ? (
        <div className="flex flex-col items-center space-y-3">
          {!isTerminal && (
            <>
              <div
                className={`relative w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-muted/30 ${iframeMinHeight}`}
              >
                {!diditIframeLoaded ? (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 bg-card/95 p-6 text-center">
                    <Loader2 className="h-9 w-9 animate-spin text-primary" aria-hidden />
                    <p className="text-sm font-medium">Loading company verification…</p>
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
                  className={`relative z-0 w-full rounded-xl bg-background ${iframeMinHeight}`}
                  title="Company verification"
                  onLoad={() => {
                    setDiditIframeLoaded(true);
                    startPolling();
                    void refreshStatus();
                  }}
                />
              </div>
              <div className="flex w-full max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
          Missing verification link from provider. Check Core Didit configuration (DIDIT_KYB_WORKFLOW_ID).
        </div>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";
import {
  acceptBusinessTeamInvite,
  BusinessAuthApiError,
  fetchBusinessSession,
} from "@/lib/businessAuthApi";
import {
  getBusinessAccessToken,
  setBusinessAccessToken,
  getStoredMerchantEnvironment,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";
import type { AppDispatch } from "@/store";
import { hydrateMerchantSession } from "@/store/merchant-session-slice";
import { Button } from "@/components/ui/button";

type Phase = "init" | "signin" | "accepting" | "error" | "done";

export function BusinessTeamInviteAcceptClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const dispatch = useDispatch<AppDispatch>();
  const token = searchParams.get("token")?.trim() ?? "";
  const [phase, setPhase] = useState<Phase>("init");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setPhase("error");
      setMessage("This invite link is missing a token. Ask your admin to resend the invitation.");
      return;
    }
    const access = getBusinessAccessToken();
    if (!access) {
      setPhase("signin");
      return;
    }
    let cancelled = false;
    setPhase("accepting");

    void (async () => {
      try {
        if (!setBusinessAccessToken(access)) {
          throw new BusinessAuthApiError("Could not read session token.", 502, null);
        }
        const { businessId } = await acceptBusinessTeamInvite(access, token);
        if (cancelled) return;
        const session = await fetchBusinessSession(access);
        const businesses = session.businesses;
        const activeRole = businesses.find((b) => b.id === businessId)?.role ?? null;
        const storedEnv = getStoredMerchantEnvironment();
        dispatch(
          hydrateMerchantSession({
            sessionType: "merchant",
            portalJwt: access,
            portalUserEmail: session.email,
            portalUserDisplayName: session.portalDisplayName,
            businesses,
            activeBusinessId: businessId,
            activeBusinessRole: activeRole,
            merchantEnvironment: storedEnv ?? "LIVE",
          })
        );
        setStoredActiveBusinessId(businessId);
        const cookieOk = await establishMerchantPortalSession(access, { businessId });
        if (cancelled) return;
        if (!cookieOk) {
          throw new BusinessAuthApiError(
            "Could not establish dashboard session. Check that the API is reachable.",
            503,
            null
          );
        }
        setPhase("done");
        router.push("/");
        router.refresh();
      } catch (e) {
        if (cancelled) return;
        setPhase("error");
        setMessage(
          e instanceof BusinessAuthApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Could not accept invite."
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, dispatch, router, pathname]);

  const returnTo =
    searchParams.size > 0 ? `${pathname}?${searchParams.toString()}` : pathname;

  if (phase === "error" && message) {
    const signinHref = `/business/signin?return_to=${encodeURIComponent(returnTo)}`;
    const signupJoinHref = `/business/signup/join?return_to=${encodeURIComponent(returnTo)}`;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-zinc-50 px-4">
        <p className="max-w-md text-center text-sm text-destructive">{message}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild>
            <Link href={returnTo}>Try again</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Home</Link>
          </Button>
        </div>
        <p className="max-w-sm text-center text-xs text-muted-foreground">
          Wrong email or need a new login?{" "}
          <Link href={signinHref} className="font-medium text-foreground underline">
            Sign in
          </Link>{" "}
          or{" "}
          <Link href={signupJoinHref} className="font-medium text-foreground underline">
            create an account
          </Link>
          .
        </p>
      </div>
    );
  }

  if (phase === "signin") {
    const signinHref = `/business/signin?return_to=${encodeURIComponent(returnTo)}`;
    const signupJoinHref = `/business/signup/join?return_to=${encodeURIComponent(returnTo)}`;
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center">
        <h1 className="text-lg font-semibold text-foreground">Accept your team invite</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Use the email your invite was sent to. Sign in if you already have an account, or create one to
          join.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
          <Button asChild>
            <Link href={signinHref}>Sign in</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href={signupJoinHref}>Create account</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-50"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-8 animate-spin text-zinc-600" aria-hidden />
      <p className="text-sm text-muted-foreground">
        {phase === "accepting" || phase === "done" ? "Joining team…" : "Checking invite…"}
      </p>
    </div>
  );
}

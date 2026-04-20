"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  BusinessAuthApiError,
  fetchBusinessSession,
  registerBusinessUser,
  submitBusinessProfileSetup,
} from "@/lib/businessAuthApi";
import {
  isTeamInviteAcceptReturnPath,
  safeBusinessPortalReturnPath,
} from "@/lib/businessPortalReturnTo";
import {
  getBusinessAccessToken,
  getStoredMerchantEnvironment,
  setBusinessAccessToken,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";
import type { AppDispatch } from "@/store";
import { hydrateMerchantSession } from "@/store/merchant-session-slice";

const PASSWORD_MIN = 10;
const DISPLAY_MIN = 2;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function formatApiError(error: unknown): string {
  if (error instanceof BusinessAuthApiError) return error.message;
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Network error: could not reach the server.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

type View = "loading" | "invalid" | "register" | "finish_profile" | "redirecting";

export function BusinessSignupJoinClient() {
  const router = useRouter();
  const dispatch = useDispatch<AppDispatch>();
  const searchParams = useSearchParams();
  const formId = useId();

  const finishProfileOnly = searchParams.get("finishProfile") === "1";
  const returnToRaw = searchParams.get("return_to")?.trim() ?? "";
  const returnTo = safeBusinessPortalReturnPath(returnToRaw || null);
  const inviteReturnOk = returnToRaw.length > 0 && isTeamInviteAcceptReturnPath(returnTo);

  const [view, setView] = useState<View>("loading");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    if (!inviteReturnOk) {
      setView("invalid");
      return;
    }

    const token = getBusinessAccessToken();
    if (!token) {
      if (finishProfileOnly) {
        const signinBack = `/business/signin?return_to=${encodeURIComponent(returnTo)}`;
        router.replace(signinBack);
        return;
      }
      setView("register");
      return;
    }

    let cancelled = false;
    void fetchBusinessSession(token)
      .then((session) => {
        if (cancelled) return;
        if (session.profileComplete) {
          setView("redirecting");
          router.replace(returnTo);
          router.refresh();
          return;
        }
        const businesses = session.businesses;
        const activeId = businesses.length > 0 ? businesses[0].id : null;
        const activeRole =
          activeId != null ? businesses.find((b) => b.id === activeId)?.role ?? null : null;
        dispatch(
          hydrateMerchantSession({
            sessionType: "merchant",
            portalJwt: token,
            portalUserEmail: session.email,
            portalUserDisplayName: session.portalDisplayName,
            businesses,
            activeBusinessId: activeId,
            activeBusinessRole: activeRole,
            merchantEnvironment: getStoredMerchantEnvironment() ?? "LIVE",
          })
        );
        if (activeId) setStoredActiveBusinessId(activeId);
        setView("finish_profile");
      })
      .catch(() => {
        if (!cancelled) {
          setFormError("Session expired or invalid. Sign in again.");
          setView("register");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [inviteReturnOk, finishProfileOnly, returnTo, router, dispatch]);

  const signinHref = `/business/signin?return_to=${encodeURIComponent(returnTo)}`;

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (password.length < PASSWORD_MIN) {
      setFormError(`Password must be at least ${PASSWORD_MIN} characters.`);
      return;
    }
    const name = displayName.trim();
    if (name.length < DISPLAY_MIN) {
      setFormError(`Enter your name (at least ${DISPLAY_MIN} characters).`);
      return;
    }

    setIsSubmitting(true);
    try {
      const { accessToken } = await registerBusinessUser({
        email: email.trim().toLowerCase(),
        password,
      });
      if (!setBusinessAccessToken(accessToken)) {
        throw new BusinessAuthApiError("Could not store session.", 502, null);
      }
      await submitBusinessProfileSetup(accessToken, { displayName: name });
      const session = await fetchBusinessSession(accessToken);
      const businesses = session.businesses;
      const activeId = businesses.length > 0 ? businesses[0].id : null;
      const activeRole =
        activeId != null ? businesses.find((b) => b.id === activeId)?.role ?? null : null;
      dispatch(
        hydrateMerchantSession({
          sessionType: "merchant",
          portalJwt: accessToken,
          portalUserEmail: session.email,
          portalUserDisplayName: session.portalDisplayName,
          businesses,
          activeBusinessId: activeId,
          activeBusinessRole: activeRole,
          merchantEnvironment: getStoredMerchantEnvironment() ?? "LIVE",
        })
      );
      if (activeId) setStoredActiveBusinessId(activeId);
      const cookieOk = await establishMerchantPortalSession(accessToken);
      if (!cookieOk) {
        throw new BusinessAuthApiError(
          "Could not start your dashboard session. Check that the API is reachable.",
          503,
          null
        );
      }
      setView("redirecting");
      router.replace(returnTo);
      router.refresh();
    } catch (err: unknown) {
      setFormError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinishProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const name = displayName.trim();
    if (name.length < DISPLAY_MIN) {
      setFormError(`Enter your name (at least ${DISPLAY_MIN} characters).`);
      return;
    }
    const token = getBusinessAccessToken();
    if (!token) {
      setFormError("Your session expired. Sign in again.");
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBusinessProfileSetup(token, { displayName: name });
      const cookieOk = await establishMerchantPortalSession(token);
      if (!cookieOk) {
        throw new BusinessAuthApiError(
          "Could not start your dashboard session. Check that the API is reachable.",
          503,
          null
        );
      }
      setView("redirecting");
      router.replace(returnTo);
      router.refresh();
    } catch (err: unknown) {
      setFormError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (view === "invalid") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 px-4 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          This page needs a valid team invite link. Open the invitation from your email again, or ask
          your admin to resend it.
        </p>
        <Button asChild variant="outline">
          <Link href="/">Home</Link>
        </Button>
      </div>
    );
  }

  if (view === "loading" || view === "redirecting") {
    return (
      <div
        className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-zinc-50"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="size-8 animate-spin text-zinc-600" aria-hidden />
        <p className="text-sm text-muted-foreground">
          {view === "redirecting" ? "Continuing to your invite…" : "Loading…"}
        </p>
      </div>
    );
  }

  if (view === "finish_profile") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
        <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
          <div className="space-y-1 text-center">
            <h1 className="text-lg font-semibold tracking-tight">Finish your profile</h1>
            <p className="text-sm text-muted-foreground">Add the name you want to show on the team.</p>
          </div>
          <form id={`${formId}-finish`} className="space-y-4" onSubmit={handleFinishProfile}>
            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor={`${formId}-dn`}>Display name</Label>
              <Input
                id={`${formId}-dn`}
                name="displayName"
                autoComplete="name"
                value={displayName}
                onChange={(ev) => setDisplayName(ev.target.value)}
                placeholder="Jane Doe"
                required
                minLength={DISPLAY_MIN}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : (
                "Continue to invite"
              )}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm space-y-6 rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-lg font-semibold tracking-tight">Create your account</h1>
          <p className="text-sm text-muted-foreground">
            Set up an account to join the business. Use the email your invite was sent to.
          </p>
        </div>
        <form id={`${formId}-reg`} className="space-y-4" onSubmit={handleRegister}>
          {formError ? (
            <p className="text-sm text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor={`${formId}-email`}>Work email</Label>
            <Input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-pw`}>Password</Label>
            <PasswordInput
              id={`${formId}-pw`}
              name="password"
              autoComplete="new-password"
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              required
              minLength={PASSWORD_MIN}
            />
            <p className="text-xs text-muted-foreground">At least {PASSWORD_MIN} characters.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`${formId}-dn2`}>Display name</Label>
            <Input
              id={`${formId}-dn2`}
              name="displayName"
              autoComplete="name"
              value={displayName}
              onChange={(ev) => setDisplayName(ev.target.value)}
              placeholder="Jane Doe"
              required
              minLength={DISPLAY_MIN}
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
        <p className="text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={signinHref} className="font-medium text-primary underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
        <p className="text-center text-xs text-muted-foreground">
          Starting your own business? Open{" "}
          <Link href="/business/signup" className="font-medium text-primary underline">
            create a business
          </Link>{" "}
          in another tab so you do not lose this invite.
        </p>
      </div>
    </div>
  );
}

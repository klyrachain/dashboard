"use client";

import { useCallback, useEffect, useId, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDispatch } from "react-redux";
import { signOut } from "next-auth/react";
import { Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BusinessAuthApiError,
  fetchBusinessAuthConfig,
  fetchBusinessPasskeyLoginOptions,
  fetchBusinessSession,
  getGoogleOAuthStartUrl,
  loginBusinessWithPassword,
  requestBusinessMagicLink,
  verifyBusinessPasskeyLogin,
} from "@/lib/businessAuthApi";
import {
  getStoredMerchantEnvironment,
  setBusinessAccessToken,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";
import { runPasskeyAuthentication } from "@/lib/webauthn-client";
import type { AppDispatch } from "@/store";
import { hydrateMerchantSession } from "@/store/merchant-session-slice";
import { cn } from "@/lib/utils";

const MAGIC_COOLDOWN_SECONDS = 30;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function safeReturnPath(returnTo: string | null): string {
  if (!returnTo?.trim()) return "/";
  const t = returnTo.trim();
  if (!t.startsWith("/") || t.startsWith("//") || t.startsWith("/api/")) {
    return "/";
  }
  return t;
}

function formatApiError(error: unknown): string {
  if (error instanceof BusinessAuthApiError) return error.message;
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Network error: could not reach the server. Confirm the API is running and try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

async function redirectAfterSession(
  router: ReturnType<typeof useRouter>,
  dispatch: AppDispatch,
  accessToken: string,
  returnTo: string | null
): Promise<void> {
  if (!setBusinessAccessToken(accessToken)) {
    throw new BusinessAuthApiError(
      "Invalid session token format.",
      502,
      null
    );
  }
  await establishMerchantPortalSession(accessToken);
  try {
    await signOut({ redirect: false });
  } catch {
    /* no admin session — ok */
  }
  const session = await fetchBusinessSession(accessToken);
  const businesses = session.businesses;
  const activeId = businesses.length > 0 ? businesses[0].id : null;
  const activeRole =
    activeId != null
      ? businesses.find((b) => b.id === activeId)?.role ?? null
      : null;
  const storedEnv = getStoredMerchantEnvironment();
  dispatch(
    hydrateMerchantSession({
      sessionType: "merchant",
      portalJwt: accessToken,
      portalUserEmail: session.email,
      portalUserDisplayName: session.portalDisplayName,
      businesses,
      activeBusinessId: activeId,
      activeBusinessRole: activeRole,
      merchantEnvironment: storedEnv ?? "LIVE",
    })
  );
  if (activeId) {
    setStoredActiveBusinessId(activeId);
  }
  if (!session.profileComplete) {
    router.push("/business/signup?finishProfile=1");
    router.refresh();
    return;
  }
  router.push(safeReturnPath(returnTo));
  router.refresh();
}

export function BusinessSigninFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const returnToParam = searchParams.get("return_to");
  const platformAccessError =
    searchParams.get("error") === "platform_access";
  const formId = useId();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [magicCooldown, setMagicCooldown] = useState(0);
  const [magicSent, setMagicSent] = useState(false);
  const [isPasskeySigningIn, setIsPasskeySigningIn] = useState(false);

  useEffect(() => {
    fetchBusinessAuthConfig()
      .then((c) => setGoogleEnabled(c.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  useEffect(() => {
    if (magicCooldown <= 0) return;
    const id = window.setInterval(() => {
      setMagicCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [magicCooldown]);

  const clearError = useCallback(() => setFormError(null), []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!isValidEmail(email)) {
      setFormError("Enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      setFormError("Enter your password.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { accessToken } = await loginBusinessWithPassword({
        email,
        password,
      });
      await redirectAfterSession(router, dispatch, accessToken, returnToParam);
    } catch (err: unknown) {
      const apiErr = err instanceof BusinessAuthApiError ? err : null;
      if (apiErr?.status === 401 || apiErr?.status === 403) {
        setFormError("Incorrect email or password.");
      } else {
        setFormError(formatApiError(err));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMagicLink = async () => {
    clearError();
    setMagicSent(false);
    if (!isValidEmail(email)) {
      setFormError("Enter your email to receive a sign-in link.");
      return;
    }
    setIsSubmitting(true);
    try {
      await requestBusinessMagicLink(email);
      setMagicCooldown(MAGIC_COOLDOWN_SECONDS);
      setMagicSent(true);
    } catch (err: unknown) {
      setFormError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = () => {
    clearError();
    window.location.href = getGoogleOAuthStartUrl();
  };

  const handlePasskeySignIn = async () => {
    clearError();
    if (!isValidEmail(email)) {
      setFormError("Enter your email, then sign in with a passkey.");
      return;
    }
    if (typeof window === "undefined" || !("PublicKeyCredential" in window)) {
      setFormError(
        "Passkeys are not supported in this browser. Try Chrome, Safari, or Edge."
      );
      return;
    }
    setIsPasskeySigningIn(true);
    try {
      const optionsJSON = await fetchBusinessPasskeyLoginOptions(email);
      const response = await runPasskeyAuthentication(optionsJSON);
      const { accessToken } = await verifyBusinessPasskeyLogin({
        email,
        response,
      });
      await redirectAfterSession(router, dispatch, accessToken, returnToParam);
    } catch (err: unknown) {
      setFormError(formatApiError(err));
    } finally {
      setIsPasskeySigningIn(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <section
          className="w-full max-w-lg"
          aria-labelledby={`${formId}-title`}
        >
          <h1
            id={`${formId}-title`}
            className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]"
          >
            Sign in to your business account
          </h1>
          <p className="mt-3 text-lg text-zinc-600">
            Use your work email and password, or choose another sign-in method
            below.
          </p>

          <form
            className="mt-10 space-y-6"
            onSubmit={handlePasswordSubmit}
            noValidate
          >
            <div className="space-y-2">
              <Label htmlFor={`${formId}-email`}>Email</Label>
              <Input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                  setMagicSent(false);
                }}
                className="h-11 text-base md:text-sm"
                disabled={isSubmitting}
                aria-invalid={!!formError}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`${formId}-password`}>Password</Label>
              <Input
                id={`${formId}-password`}
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                className="h-11 text-base md:text-sm"
                disabled={isSubmitting}
                aria-invalid={!!formError}
              />
            </div>

            {formError ? (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            ) : null}

            {magicSent ? (
              <p className="text-sm text-zinc-600" role="status" aria-live="polite">
                Check your inbox for a sign-in link. It expires in about 15
                minutes.
              </p>
            ) : null}

            <Button
              type="submit"
              size="lg"
              className="h-12 w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </Button>
          </form>

          <div className="mt-8 space-y-4">
            <Button
              type="button"
              variant="outline"
              className={cn(
                "h-12 w-full gap-2 text-foreground",
                !isValidEmail(email) && "opacity-80"
              )}
              disabled={
                isSubmitting ||
                magicCooldown > 0 ||
                !isValidEmail(email) ||
                isPasskeySigningIn
              }
              onClick={() => void handlePasskeySignIn()}
            >
              {isPasskeySigningIn ? (
                <>
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                  Signing in with passkey…
                </>
              ) : (
                <>
                  <Fingerprint className="size-4 shrink-0" aria-hidden />
                  Sign in with passkey
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-foreground"
              disabled={isSubmitting || magicCooldown > 0 || !isValidEmail(email)}
              onClick={() => void handleMagicLink()}
            >
              {magicCooldown > 0
                ? `Resend link in ${magicCooldown}s`
                : "Email me a sign-in link"}
            </Button>

            {googleEnabled ? (
              <Button
                type="button"
                variant="outline"
                className="h-12 w-full text-foreground"
                onClick={handleGoogle}
                disabled={isSubmitting}
              >
                Continue with Google
              </Button>
            ) : null}
          </div>

          {platformAccessError ? (
            <p
              className="mt-6 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-center text-sm text-destructive"
              role="alert"
            >
              Platform access is not available. Check Core API configuration or
              sign in with a business account.
            </p>
          ) : null}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Morapay?{" "}
            <Link
              href="/business/signup"
              className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              Create a business account
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}


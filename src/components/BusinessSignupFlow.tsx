"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ChevronDown, Fingerprint, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  BUSINESS_ROLES,
  PRIMARY_GOALS,
  type BusinessRole,
  type PrimaryGoal,
  persistBusinessOnboarding,
  toApiPrimaryGoal,
  toApiSignupRole,
} from "@/types/businessSignup";
import {
  BusinessAuthApiError,
  type BusinessEmailCheckResult,
  checkBusinessEmail,
  completeBusinessOnboarding,
  consumePortalOrMagicTokenOnce,
  fetchBusinessAuthConfig,
  fetchBusinessSession,
  getGoogleOAuthStartUrl,
  requestBusinessMagicLink,
  fetchBusinessPasskeyRegistrationOptions,
  registerBusinessPasskey,
  submitBusinessProfileSetup,
  submitOnboardingEntity,
} from "@/lib/businessAuthApi";
import { pathFromLandingHint } from "@/lib/businessLandingRoutes";
import { cn } from "@/lib/utils";
import {
  clearBusinessAccessToken,
  getBusinessAccessToken,
  setBusinessAccessToken,
} from "@/lib/businessAuthStorage";

const STEP_COUNT = 4;
const PASSWORD_MIN_LENGTH = 10;
const DISPLAY_NAME_MIN_LENGTH = 2;
const MAGIC_LINK_COOLDOWN_SECONDS = 30;
const EMAIL_CHECK_DEBOUNCE_MS = 450;

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isOptionalUrl(value: string): boolean {
  const v = value.trim();
  if (v.length === 0) return true;
  try {
    const withProtocol = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    new URL(withProtocol);
    return true;
  } catch {
    return false;
  }
}

function formatApiError(error: unknown): string {
  if (error instanceof BusinessAuthApiError) return error.message;
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    return "Network error: could not reach the server. If this persists, confirm the API is running and try again.";
  }
  if (error instanceof Error) return error.message;
  return "Something went wrong. Please try again.";
}

/** After magic-link consume fails (used, expired, or scanner burned the token). */
function formatMagicLinkConsumeError(error: unknown): string {
  if (error instanceof BusinessAuthApiError) {
    const m = error.message.toLowerCase();
    if (
      m.includes("invalid") ||
      m.includes("expired") ||
      m.includes("used") ||
      error.status === 400 ||
      error.status === 401 ||
      error.status === 404
    ) {
      return "This sign-in link is no longer valid. It may have already been used (each link works only once), expired (about 15 minutes), or opened by an email security scanner before you. Request a new link below.";
    }
    return error.message;
  }
  return formatApiError(error);
}

const selectClassName =
  "border-input bg-background text-foreground focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full appearance-none rounded-md border px-3 py-2 text-base shadow-xs outline-none focus-visible:ring-[3px] md:text-sm pr-10";

export function BusinessSignupFlow() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const formId = useId();
  const [step, setStep] = useState(1);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);
  const [googleEnabled, setGoogleEnabled] = useState(false);
  const [isResolvingPortal, setIsResolvingPortal] = useState(false);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [passkeyName, setPasskeyName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [role, setRole] = useState<BusinessRole | "">("");
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | "">("");

  const [stepError, setStepError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [magicLinkError, setMagicLinkError] = useState<string | null>(null);
  const [isConsumingMagicLink, setIsConsumingMagicLink] = useState(false);
  const [postOnboardingPath, setPostOnboardingPath] = useState<string | null>(
    null
  );
  const [passkeyHint, setPasskeyHint] = useState<string | null>(null);
  const [magicLinkCooldownSeconds, setMagicLinkCooldownSeconds] = useState(0);
  const [emailAvailability, setEmailAvailability] = useState<{
    email: string;
    result: BusinessEmailCheckResult;
  } | null>(null);
  const [emailCheckLoading, setEmailCheckLoading] = useState(false);
  const emailCheckSeqRef = useRef(0);

  const magicTokenFromEmail = searchParams.get("magic")?.trim() ?? "";

  const magicLinkCooldownActive = magicLinkCooldownSeconds > 0;
  useEffect(() => {
    if (!magicLinkCooldownActive) return;
    const id = window.setInterval(() => {
      setMagicLinkCooldownSeconds((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [magicLinkCooldownActive]);

  useEffect(() => {
    fetchBusinessAuthConfig()
      .then((c) => setGoogleEnabled(c.googleEnabled))
      .catch(() => setGoogleEnabled(false));
  }, []);

  /** OAuth / portal handoff only — not ?magic= (those need a click so scanners don’t burn single-use tokens). */
  useEffect(() => {
    if (magicTokenFromEmail) return;

    const portalToken =
      searchParams.get("portal_token")?.trim() ||
      searchParams.get("token")?.trim() ||
      searchParams.get("magic_token")?.trim();
    if (!portalToken) return;

    let cancelled = false;
    setIsResolvingPortal(true);
    setStepError(null);

    void consumePortalOrMagicTokenOnce(portalToken)
      .then(({ accessToken }) => {
        if (cancelled) return;
        setBusinessAccessToken(accessToken);
        setStep(2);
        router.replace("/business/signup", { scroll: false });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setStepError(formatApiError(err));
        router.replace("/business/signup", { scroll: false });
      })
      .finally(() => {
        if (!cancelled) setIsResolvingPortal(false);
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, magicTokenFromEmail]);

  /** After password/passkey sign-in when profile is incomplete (step 4). */
  useEffect(() => {
    if (searchParams.get("finishProfile") !== "1") return;
    if (magicTokenFromEmail) return;
    const portalHandoff =
      searchParams.get("portal_token")?.trim() ||
      searchParams.get("token")?.trim() ||
      searchParams.get("magic_token")?.trim();
    if (portalHandoff) return;

    const token = getBusinessAccessToken();
    if (!token) {
      router.replace("/business/signin");
      return;
    }

    let cancelled = false;
    setStepError(null);

    void fetchBusinessSession(token)
      .then((session) => {
        if (cancelled) return;
        if (session.profileComplete) {
          router.replace("/app");
          return;
        }
        setPostOnboardingPath("/app");
        setStep(4);
        router.replace("/business/signup", { scroll: false });
      })
      .catch(() => {
        if (!cancelled) router.replace("/business/signin");
      });

    return () => {
      cancelled = true;
    };
  }, [searchParams, router, magicTokenFromEmail]);

  /** Debounced email check while user types (step 1). */
  useEffect(() => {
    const normalized = email.trim().toLowerCase();
    if (!isValidEmail(email)) {
      emailCheckSeqRef.current += 1;
      setEmailAvailability(null);
      setEmailCheckLoading(false);
      return;
    }

    const seq = ++emailCheckSeqRef.current;
    setEmailCheckLoading(true);

    const timerId = window.setTimeout(() => {
      void checkBusinessEmail(normalized)
        .then((result) => {
          if (seq !== emailCheckSeqRef.current) return;
          setEmailAvailability({ email: normalized, result });
        })
        .catch(() => {
          if (seq !== emailCheckSeqRef.current) return;
          setEmailAvailability(null);
        })
        .finally(() => {
          if (seq === emailCheckSeqRef.current) {
            setEmailCheckLoading(false);
          }
        });
    }, EMAIL_CHECK_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [email]);

  const normalizedStep1Email = email.trim().toLowerCase();
  const emailCheckAppliesToInput =
    emailAvailability !== null &&
    emailAvailability.email === normalizedStep1Email;
  const emailNotAvailable =
    emailCheckAppliesToInput && !emailAvailability.result.available;
  const suggestPasswordLogin =
    emailCheckAppliesToInput &&
    emailAvailability.result.registered &&
    emailAvailability.result.hasPassword;

  const handleConfirmMagicLinkSignIn = useCallback(() => {
    if (!magicTokenFromEmail) return;
    setMagicLinkError(null);
    setIsConsumingMagicLink(true);
    void consumePortalOrMagicTokenOnce(magicTokenFromEmail)
      .then(({ accessToken }) => {
        setBusinessAccessToken(accessToken);
        setStep(2);
        router.replace("/business/signup", { scroll: false });
      })
      .catch((err: unknown) => {
        setMagicLinkError(formatMagicLinkConsumeError(err));
      })
      .finally(() => setIsConsumingMagicLink(false));
  }, [magicTokenFromEmail, router]);

  const clearError = useCallback(() => setStepError(null), []);

  const goBack = useCallback(() => {
    clearError();
    setOauthMessage(null);
    setPasskeyHint(null);
    if (step === 2) {
      clearBusinessAccessToken();
    }
    setStep((s) => Math.max(1, s - 1));
  }, [clearError, step]);

  const handleMagicLinkRequest = async () => {
    clearError();
    setOauthMessage(null);
    if (!isValidEmail(email)) {
      setStepError("Enter your email to receive a sign-in link.");
      return;
    }
    if (emailNotAvailable) {
      setStepError(
        suggestPasswordLogin
          ? "Welcome back. Sign in instead."
          : "Welcome back. Sign in or use a different address."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await checkBusinessEmail(email);
      setEmailAvailability({
        email: email.trim().toLowerCase(),
        result,
      });
      if (!result.available) {
        setStepError(
          result.registered && result.hasPassword
            ? "Welcome back. Sign in instead."
            : "Welcome back. Sign in or use a different address."
        );
        return;
      }
      await requestBusinessMagicLink(email);
      setMagicLinkCooldownSeconds(MAGIC_LINK_COOLDOWN_SECONDS);
    } catch (err: unknown) {
      setStepError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleStart = async () => {
    clearError();
    setOauthMessage(null);
    if (!isValidEmail(email)) {
      setStepError("Enter your work email first, then continue with Google.");
      return;
    }
    if (emailNotAvailable) {
      setStepError(
        suggestPasswordLogin
          ? "This email already uses a password. Sign in with your password, or use another email for Google."
          : "Welcome back. Sign in or use a different address."
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const result = await checkBusinessEmail(email);
      setEmailAvailability({
        email: email.trim().toLowerCase(),
        result,
      });
      if (!result.available) {
        setStepError(
          result.registered && result.hasPassword
            ? "This email already uses a password. Sign in with your password, or use another email for Google."
            : "Welcome back. Sign in or use a different address."
        );
        return;
      }
      window.location.href = getGoogleOAuthStartUrl();
    } catch (err: unknown) {
      setStepError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const name = companyName.trim();
    if (name.length < 2) {
      setStepError("Enter your company name.");
      return;
    }
    if (!isOptionalUrl(companyWebsite)) {
      setStepError("Enter a valid website URL or leave blank.");
      return;
    }

    const token = getBusinessAccessToken();
    if (!token) {
      setStepError("Your session expired. Start again from step one.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitOnboardingEntity(token, {
        companyName: name,
        website: companyWebsite.trim() || undefined,
      });
      setStep(3);
    } catch (err: unknown) {
      setStepError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!role || !primaryGoal) {
      setStepError("Choose both your role and primary goal.");
      return;
    }

    const token = getBusinessAccessToken();
    if (!token) {
      setStepError("Your session expired. Start again from step one.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      const { accessToken, landingHint } = await completeBusinessOnboarding(
        token,
        {
          signupRole: toApiSignupRole(role),
          primaryGoal: toApiPrimaryGoal(primaryGoal),
        }
      );
      setBusinessAccessToken(accessToken);
      setPostOnboardingPath(pathFromLandingHint(landingHint));
      setStep(4);
    } catch (err: unknown) {
      setStepError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep4 = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const name = displayName.trim();
    if (name.length < DISPLAY_NAME_MIN_LENGTH) {
      setStepError("Enter your name (at least 2 characters).");
      return;
    }
    if (profilePassword.length < PASSWORD_MIN_LENGTH) {
      setStepError(
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
      );
      return;
    }

    const token = getBusinessAccessToken();
    const path = postOnboardingPath;
    if (!token || !path) {
      setStepError("Your session expired. Start again from step one.");
      setStep(1);
      return;
    }

    setIsSubmitting(true);
    try {
      await submitBusinessProfileSetup(token, {
        displayName: name,
        password: profilePassword,
      });
      const profile = {
        email: email.trim().toLowerCase() || undefined,
        companyName: companyName.trim(),
        companyWebsite: companyWebsite.trim(),
        role: role as BusinessRole,
        primaryGoal: primaryGoal as PrimaryGoal,
        displayName: name,
        completedAt: new Date().toISOString(),
      };
      persistBusinessOnboarding(profile);
      setIsRedirecting(true);
      window.setTimeout(() => {
        router.push(`${path}?sandbox=1`);
      }, 600);
    } catch (err: unknown) {
      setStepError(formatApiError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOptionalPasskeyInfo = useCallback(() => {
    setPasskeyHint(
      typeof window !== "undefined" &&
        window.PublicKeyCredential !== undefined
        ? "You can register Face ID, Touch ID, or a security key after signup under Settings → Security."
        : "Passkeys work on supported browsers. Add one anytime from Settings → Security after signup."
    );
  }, []);

  const handleAddPasskey = useCallback(async () => {
    clearError();
    setPasskeyHint(null);

    if (typeof window === "undefined") {
      return;
    }

    if (!("PublicKeyCredential" in window)) {
      setStepError(
        "Passkeys are not supported in this browser. Try a recent version of Chrome, Safari, or Edge."
      );
      return;
    }

    const name = displayName.trim();
    if (name.length < DISPLAY_NAME_MIN_LENGTH) {
      setStepError("Enter your name before adding a passkey.");
      return;
    }

    if (profilePassword.length < PASSWORD_MIN_LENGTH) {
      setStepError(
        `Set a password of at least ${PASSWORD_MIN_LENGTH} characters before adding a passkey.`
      );
      return;
    }

    const token = getBusinessAccessToken();
    if (!token) {
      setStepError("Your session expired. Start again from step one.");
      setStep(1);
      return;
    }

    setIsRegisteringPasskey(true);

    try {
      await submitBusinessProfileSetup(token, {
        displayName: name,
        password: profilePassword,
      });

      const options = await fetchBusinessPasskeyRegistrationOptions(token);

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { startRegistration } = require("@simplewebauthn/browser") as {
        startRegistration: (opts: unknown) => Promise<unknown>;
      };

      const credential = await startRegistration(options);

      await registerBusinessPasskey(token, {
        response: credential,
        passkeyName,
      });

      setPasskeyHint(
        "Passkey added. Next time you sign in, you can use Face ID, Touch ID, or your security key."
      );
    } catch (error: unknown) {
      setStepError(formatApiError(error));
    } finally {
      setIsRegisteringPasskey(false);
    }
  }, [
    clearError,
    displayName,
    passkeyName,
    profilePassword,
    setStep,
  ]);

  const progress = (step / STEP_COUNT) * 100;

  if (magicTokenFromEmail) {
    return (
      <main className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900">
        <section
          className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-4 py-12 sm:px-6"
          aria-labelledby={`${formId}-magic-gate-title`}
        >
          <h1
            id={`${formId}-magic-gate-title`}
            className="text-3xl font-semibold tracking-tight [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif] sm:text-4xl"
          >
            You&apos;re all set.
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Click below to securely access your account and finish setting up.
          </p>


          {magicLinkError ? (
            <p className="mt-6 text-sm text-destructive" role="alert">
              {magicLinkError}
            </p>
          ) : null}

          <Button
            type="button"
            size="lg"
            className="mt-8 h-12 w-full sm:w-auto sm:min-w-[200px]"
            onClick={handleConfirmMagicLinkSignIn}
            disabled={isConsumingMagicLink}
          >
            {isConsumingMagicLink ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Signing you in…
              </>
            ) : (
              "Continue"
            )}
          </Button>

          <p className="mt-8 text-center text-sm text-zinc-500 sm:text-left">
            <Link
              href="/business/signup"
              className="font-medium text-zinc-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
            >
              Cancel — request a new link
            </Link>
          </p>
        </section>
      </main>
    );
  }

  if (isResolvingPortal) {
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-zinc-50 text-zinc-900"
        aria-busy="true"
        aria-label="Completing sign-in"
      >
        <Loader2 className="size-10 animate-spin text-zinc-600" aria-hidden />
        <p className="text-lg text-zinc-600">Signing you in…</p>
        <span className="sr-only">Completing sign-in</span>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-zinc-50 text-zinc-900">
      <header className="shrink-0 px-4 py-4 backdrop-blur-sm sm:px-8">
        <div className="mx-auto flex max-w-2xl items-center gap-4">
          {step > 1 && !isRedirecting ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="shrink-0"
              onClick={goBack}
              disabled={isSubmitting}
              aria-label="Go to previous step"
            >
              <ArrowLeft className="size-4" aria-hidden />
            </Button>
          ) : (
            <span className="w-8 shrink-0" aria-hidden />
          )}
          <div
            className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-200"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={STEP_COUNT}
            aria-label={`Step ${step} of ${STEP_COUNT}`}
          >
            <motion.div
              className="h-full rounded-full bg-zinc-900"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          </div>
          <span className="w-10 shrink-0 text-right text-sm tabular-nums text-zinc-500">
            {step}/{STEP_COUNT}
          </span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 sm:px-6">
        <AnimatePresence mode="wait">
          {isRedirecting ? (
            <motion.section
              key="done"
              role="status"
              aria-live="polite"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-lg text-center"
            >
              <p className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]">
                You&apos;re in sandbox mode
              </p>
              <p className="mt-3 text-zinc-600">Opening your workspace…</p>
            </motion.section>
          ) : step === 1 ? (
            <motion.section
              key="step1"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
              aria-labelledby={`${formId}-step1-title`}
            >
              <h1
                id={`${formId}-step1-title`}
                className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]"
              >
                Create your business account
              </h1>
              <p className="mt-3 text-lg text-zinc-600">
                Use your work email so we can recognize your company.
              </p>

              <div className="mt-10 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-email`}>Email</Label>
                  <div className="relative">
                    <Input
                      id={`${formId}-email`}
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        clearError();
                      }}
                      className={cn(
                        "h-11 text-base md:text-sm",
                        isValidEmail(email) &&
                          emailCheckLoading &&
                          "pr-10",
                        emailNotAvailable &&
                          "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
                      )}
                      disabled={isSubmitting}
                      aria-busy={
                        isValidEmail(email) && emailCheckLoading
                      }
                      aria-invalid={
                        emailNotAvailable || (!!stepError && step === 1)
                      }
                      aria-describedby={
                        emailNotAvailable
                          ? `${formId}-email-unavailable`
                          : undefined
                      }
                    />
                    {isValidEmail(email) && emailCheckLoading ? (
                      <>
                        <span
                          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500"
                          aria-hidden
                        >
                          <Loader2 className="size-4 shrink-0 animate-spin" />
                        </span>
                        <span
                          className="sr-only"
                          role="status"
                          aria-live="polite"
                        >
                          Checking email
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                {emailNotAvailable ? (
                  <p className="text-sm text-zinc-600">
                    {suggestPasswordLogin ? (
                      <>
                        Welcome back.{" "}
                        <Link
                          href="/business/signin"
                          className="font-medium text-zinc-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                        >
                          Sign in
                        </Link>{" "}
                        instead.
                      </>
                    ) : (
                      <>
                        Welcome back.{" "}
                        <Link
                          href="/business/signin"
                          className="font-medium text-zinc-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
                        >
                          Sign in
                        </Link>{" "}
                        or use a different address.
                      </>
                    )}
                  </p>
                ) : null}

                {stepError && step === 1 ? (
                  <p className="text-sm text-destructive" role="alert">
                    {stepError}
                  </p>
                ) : null}

                <Button
                  type="button"
                  size="lg"
                  className="h-12 w-full"
                  disabled={
                    isSubmitting ||
                    magicLinkCooldownSeconds > 0 ||
                    emailNotAvailable
                  }
                  onClick={() => void handleMagicLinkRequest()}
                  aria-describedby={
                    magicLinkCooldownSeconds > 0
                      ? `${formId}-magic-cooldown`
                      : undefined
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Sending…
                    </>
                  ) : magicLinkCooldownSeconds > 0 ? (
                    "Link sent"
                  ) : (
                    "Send sign-in link"
                  )}
                </Button>
                {magicLinkCooldownSeconds > 0 ? (
                  <p
                    id={`${formId}-magic-cooldown`}
                    className="text-center text-sm text-zinc-600 tabular-nums"
                    role="status"
                    aria-live="polite"
                  >
                    Request another link in {magicLinkCooldownSeconds}s
                  </p>
                ) : null}

                {/* <div className="relative py-2">
                  <div
                    className="absolute inset-0 flex items-center"
                    aria-hidden
                  >
                    <span className="w-full border-t border-zinc-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase tracking-wide text-zinc-500">
                    <span className="bg-zinc-50 px-3">Or</span>
                  </div>
                </div> */}

                {googleEnabled ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 w-full text-foreground"
                    onClick={() => void handleGoogleStart()}
                    disabled={isSubmitting || emailNotAvailable}
                  >
                    Continue with Google
                  </Button>
                ) : (
                  <p className="text-center text-xs text-zinc-500">
                    {/* Google sign-in appears when enabled on the API. */}
                  </p>
                )}
                {oauthMessage ? (
                  <p className="text-center text-sm text-zinc-600" role="status">
                    {oauthMessage}
                  </p>
                ) : null}
              </div>
            </motion.section>
          ) : step === 2 ? (
            <motion.section
              key="step2"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
              aria-labelledby={`${formId}-step2-title`}
            >
              <h1
                id={`${formId}-step2-title`}
                className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]"
              >
                Great to meet you.
                <br />
                What are we building for?
              </h1>

              <form className="mt-10 space-y-6" onSubmit={handleStep2} noValidate>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-company`}>Company name</Label>
                  <Input
                    id={`${formId}-company`}
                    name="company"
                    type="text"
                    autoComplete="organization"
                    placeholder="Acme Inc."
                    value={companyName}
                    onChange={(e) => {
                      setCompanyName(e.target.value);
                      clearError();
                    }}
                    className="h-11 text-base md:text-sm"
                    disabled={isSubmitting}
                    aria-invalid={!!stepError && step === 2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-website`}>
                    Company website{" "}
                    <span className="font-normal text-zinc-500">(optional)</span>
                  </Label>
                  <Input
                    id={`${formId}-website`}
                    name="website"
                    type="url"
                    autoComplete="url"
                    placeholder="https://acme.com"
                    value={companyWebsite}
                    onChange={(e) => {
                      setCompanyWebsite(e.target.value);
                      clearError();
                    }}
                    className="h-11 text-base md:text-sm"
                    disabled={isSubmitting}
                    aria-invalid={!!stepError && step === 2}
                  />
                </div>

                {stepError && step === 2 ? (
                  <p className="text-sm text-destructive" role="alert">
                    {stepError}
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
                      Saving…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>
            </motion.section>
          ) : step === 3 ? (
            <motion.section
              key="step3"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
              aria-labelledby={`${formId}-step3-title`}
            >
              <h1
                id={`${formId}-step3-title`}
                className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]"
              >
                Let&apos;s customize your experience
              </h1>
              <p className="mt-3 text-lg text-zinc-600">
                How do you plan to use the platform?
              </p>

              <form className="mt-10 space-y-8" onSubmit={handleStep3} noValidate>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-role`}>Your role</Label>
                  <div className="relative">
                    <select
                      id={`${formId}-role`}
                      name="role"
                      value={role}
                      onChange={(e) => {
                        setRole(e.target.value as BusinessRole | "");
                        clearError();
                      }}
                      className={selectClassName}
                      disabled={isSubmitting}
                      aria-invalid={!!stepError && step === 3}
                    >
                      <option value="">Select your role</option>
                      {BUSINESS_ROLES.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                      aria-hidden
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-goal`}>Primary goal</Label>
                  <div className="relative">
                    <select
                      id={`${formId}-goal`}
                      name="goal"
                      value={primaryGoal}
                      onChange={(e) => {
                        setPrimaryGoal(e.target.value as PrimaryGoal | "");
                        clearError();
                      }}
                      className={selectClassName}
                      disabled={isSubmitting}
                      aria-invalid={!!stepError && step === 3}
                    >
                      <option value="">Select a goal</option>
                      {PRIMARY_GOALS.map((g) => (
                        <option key={g.value} value={g.value}>
                          {g.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-zinc-500"
                      aria-hidden
                    />
                  </div>
                </div>

                {stepError && step === 3 ? (
                  <p className="text-sm text-destructive" role="alert">
                    {stepError}
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
                      Saving…
                    </>
                  ) : (
                    "Continue"
                  )}
                </Button>
              </form>

              <p className="mt-8 text-center text-sm text-zinc-500">
                Legal entity, KYC, and bank details are only required when you go
                live or move money.
              </p>
            </motion.section>
          ) : (
            <motion.section
              key="step4"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-lg"
              aria-labelledby={`${formId}-step4-title`}
            >
              <h1
                id={`${formId}-step4-title`}
                className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl [font-family:var(--font-inter-tight),ui-sans-serif,sans-serif]"
              >
                Set up your profile
              </h1>
              <p className="mt-3 text-lg text-zinc-600">
                Name and password secure your account. Passkey is optional.
              </p>

              <form className="mt-10 space-y-6" onSubmit={handleStep4} noValidate>
                <div className="space-y-2">
                  <Label htmlFor={`${formId}-displayName`}>Your name</Label>
                  <Input
                    id={`${formId}-displayName`}
                    name="name"
                    type="text"
                    autoComplete="name"
                    placeholder="Jane Doe"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      clearError();
                    }}
                    className="h-11 text-base md:text-sm"
                    disabled={isSubmitting}
                    aria-invalid={!!stepError && step === 4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${formId}-profilePassword`}>Password</Label>
                  <Input
                    id={`${formId}-profilePassword`}
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    placeholder={`At least ${PASSWORD_MIN_LENGTH} characters`}
                    value={profilePassword}
                    onChange={(e) => {
                      setProfilePassword(e.target.value);
                      clearError();
                    }}
                    className="h-11 text-base md:text-sm"
                    disabled={isSubmitting}
                    aria-invalid={!!stepError && step === 4}
                  />
                </div>

                <section
                  className="rounded-lg border border-zinc-200 bg-white/60 p-4"
                  aria-label="Passkey (optional)"
                >
                  <div className="flex items-start gap-3">
                    <Fingerprint
                      className="mt-0.5 size-5 shrink-0 text-zinc-600"
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-zinc-900">
                          Passkey (optional)
                        </p>
                        <p className="text-sm text-zinc-600">
                          Use Face ID, Touch ID, or a security key for faster
                          sign-in next time. You can also set this up later in
                          Settings → Security.
                        </p>
                      </div>

                      {/* <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                        <div className="space-y-1">
                          <Label htmlFor={`${formId}-passkeyName`}>
                            Passkey label{" "}
                            <span className="font-normal text-zinc-500">
                              (optional)
                            </span>
                          </Label>
                          <Input
                            id={`${formId}-passkeyName`}
                            name="passkeyName"
                            type="text"
                            autoComplete="off"
                            placeholder="Work laptop, iPhone, YubiKey…"
                            value={passkeyName}
                            onChange={(e) => {
                              setPasskeyName(e.target.value);
                              clearError();
                            }}
                            className="h-11 text-base md:text-sm"
                            disabled={isRegisteringPasskey || isSubmitting}
                          />
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 sm:mt-0 sm:h-11"
                          onClick={() => void handleAddPasskey()}
                          disabled={isRegisteringPasskey || isSubmitting}
                        >
                          {isRegisteringPasskey ? (
                            <>
                              <Loader2
                                className="mr-2 size-4 animate-spin"
                                aria-hidden
                              />
                              Adding…
                            </>
                          ) : (
                            "Add passkey"
                          )}
                        </Button>
                      </div> */}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="px-0 text-xs font-normal text-zinc-600 hover:text-zinc-900 hover:bg-transparent"
                        onClick={handleOptionalPasskeyInfo}
                      >
                        Learn how passkeys work
                      </Button>

                      {passkeyHint ? (
                        <p
                          className="text-sm text-zinc-600"
                          role="status"
                          aria-live="polite"
                        >
                          {passkeyHint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </section>

                {stepError && step === 4 ? (
                  <p className="text-sm text-destructive" role="alert">
                    {stepError}
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
                      Finishing…
                    </>
                  ) : (
                    "Enter sandbox"
                  )}
                </Button>
              </form>
            </motion.section>
          )}
        </AnimatePresence>
      </div>

      <footer className="shrink-0 px-4 py-6 text-center text-sm text-zinc-500 backdrop-blur-sm">
        <p>
          Already have an account?{" "}
          <Link
            href="/business/signin"
            className="font-medium text-zinc-900 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            Sign in
          </Link>
        </p>
      </footer>
    </main>
  );
}

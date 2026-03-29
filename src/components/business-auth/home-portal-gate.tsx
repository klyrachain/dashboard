"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";
import type { Session } from "next-auth";
import type { SessionUser } from "@/lib/auth";
import { consumeBusinessLoginCode } from "@/lib/businessAuthApi";
import { getBusinessAccessToken, setBusinessAccessToken } from "@/lib/businessAuthStorage";
import { setPortalJwt } from "@/store/merchant-session-slice";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";

function adminCoreTokenFromSession(session: Session | null): string | undefined {
  const u = session?.user as SessionUser | undefined;
  const t = u?.token?.trim();
  return t ? t : undefined;
}

export function HomePortalGate() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const handledRef = useRef<string | null>(null);

  const [mode, setMode] = useState<"processing_code" | "bootstrap" | null>(
    null
  );
  const [codeError, setCodeError] = useState<string | null>(null);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const loginCode = searchParams.get("login_code")?.trim() ?? "";
  const sessionBootstrap = searchParams.get("session_bootstrap");
  const returnToParam = searchParams.get("return_to")?.trim() ?? "";

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && adminCoreTokenFromSession(session)) {
      return;
    }

    if (loginCode) {
      const key = `code:${loginCode}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      startTransition(() => {
        setMode("processing_code");
      });

      const returnTo =
        returnToParam.startsWith("/") && !returnToParam.startsWith("//")
          ? returnToParam
          : "/";

      void (async () => {
        try {
          const { accessToken } = await consumeBusinessLoginCode(loginCode);
          if (!setBusinessAccessToken(accessToken)) {
            setCodeError(
              "This sign-in link returned an invalid token. Request a new link from your email."
            );
            setMode(null);
            handledRef.current = null;
            const u = new URL(window.location.href);
            u.searchParams.delete("login_code");
            u.searchParams.delete("return_to");
            router.replace(u.pathname + u.search);
            return;
          }
          dispatch(setPortalJwt(accessToken));
          const ok = await establishMerchantPortalSession(accessToken);
          if (!ok) {
            setCodeError(
              "We could not verify your business session. Try again or use business login if you have a password."
            );
            setMode(null);
            handledRef.current = null;
            const u = new URL(window.location.href);
            u.searchParams.delete("login_code");
            u.searchParams.delete("return_to");
            router.replace(u.pathname + u.search);
            return;
          }
          const safeTo =
          returnTo.startsWith("/") &&
          !returnTo.startsWith("//") &&
          !returnTo.startsWith("/api/")
            ? returnTo
            : "/";
        router.replace(safeTo);
        } catch {
          setCodeError(
            "This sign-in link is invalid or has expired. Request a new link from your email."
          );
          setMode(null);
          handledRef.current = null;
          const u = new URL(window.location.href);
          u.searchParams.delete("login_code");
          u.searchParams.delete("return_to");
          router.replace(u.pathname + u.search);
        }
      })();
      return;
    }

    if (sessionBootstrap === "1") {
      const returnTo =
        returnToParam.startsWith("/") && !returnToParam.startsWith("//")
          ? returnToParam
          : "/";
      const key = `boot:${returnTo}`;
      if (handledRef.current === key) return;
      handledRef.current = key;
      startTransition(() => {
        setMode("bootstrap");
      });

      void (async () => {
        try {
          const token = getBusinessAccessToken();
          if (token) {
            const ok = await establishMerchantPortalSession(token);
            if (ok) {
              dispatch(setPortalJwt(token));
              const safeTo =
              returnTo.startsWith("/") &&
              !returnTo.startsWith("//") &&
              !returnTo.startsWith("/api/")
                ? returnTo
                : "/";
            router.replace(safeTo);
              return;
            }
          }
          await fetch("/api/portal/role-sync", {
            method: "GET",
            credentials: "include",
          });
          const safeTo =
          returnTo.startsWith("/") &&
          !returnTo.startsWith("//") &&
          !returnTo.startsWith("/api/")
            ? returnTo
            : "/";
        router.replace(safeTo);
        } catch {
          setBootstrapError(
            "We could not restore your session. Open the sign-in link from your email again."
          );
          setMode(null);
          handledRef.current = null;
          const u = new URL(window.location.href);
          u.searchParams.delete("session_bootstrap");
          u.searchParams.delete("return_to");
          router.replace(u.pathname + u.search);
        }
      })();
    }
  }, [
    loginCode,
    sessionBootstrap,
    returnToParam,
    router,
    dispatch,
    status,
    session,
  ]);

  if (status === "authenticated" && adminCoreTokenFromSession(session)) {
    return null;
  }

  if (mode === "processing_code" || mode === "bootstrap") {
    const label =
      mode === "processing_code"
        ? "Processing your sign-in"
        : "Signing you in";
    const sub =
      mode === "processing_code"
        ? "Please wait while we verify your link."
        : "Restoring your session.";

    return (
      <div
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-4 bg-background px-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <Loader2
          className="size-10 shrink-0 animate-spin text-primary"
          aria-hidden
        />
        <p className="text-lg font-semibold">{label}</p>
        <p className="max-w-md text-center text-sm text-muted-foreground">
          {sub}
        </p>
      </div>
    );
  }

  if (codeError) {
    return (
      <section
        className="border-b border-border bg-muted/30 px-4 py-6"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-base font-semibold text-destructive">
            Sign-in link problem
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{codeError}</p>
          <p className="mt-3 text-sm text-muted-foreground">
            Use the latest link from your email, or{" "}
            <a
              href="/business/signin"
              className="font-medium text-primary underline underline-offset-2"
            >
              sign in with email and password
            </a>
            .
          </p>
        </div>
      </section>
    );
  }

  if (bootstrapError) {
    return (
      <section
        className="border-b border-border bg-muted/30 px-4 py-6"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto max-w-2xl">
          <h2 className="text-base font-semibold text-destructive">
            Session could not be restored
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {bootstrapError}
          </p>
        </div>
      </section>
    );
  }

  return null;
}

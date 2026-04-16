"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useDispatch } from "react-redux";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  postLoginPasskeyOptions,
  postLoginPasskeyVerify,
} from "@/lib/auth-api";
import {
  formatWebAuthnClientError,
  isWebAuthnAvailable,
  runPasskeyAuthentication,
} from "@/lib/webauthn-client";
import { isAuthSuccess } from "@/types/auth";
import { clearBusinessAccessToken } from "@/lib/businessAuthStorage";
import { clearMerchantPortalHttpOnlyCookie } from "@/lib/portal-auth-client";
import { clearMerchantPortal } from "@/store/merchant-session-slice";

export function LoginPasskeyStep({ email: initialEmail }: { email: string }) {
  const dispatch = useDispatch();
  const [email, setEmail] = useState(initialEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setEmail(initialEmail);
  }, [initialEmail]);

  const handlePasskey = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email");
      return;
    }
    if (!isWebAuthnAvailable()) {
      setError(
        "Passkeys are not supported in this browser. Use a current version of Chrome, Safari, or Edge."
      );
      return;
    }
    setError(null);
    setLoading(true);
    const optionsRes = await postLoginPasskeyOptions({ email: trimmed });
    if (!isAuthSuccess(optionsRes) || !optionsRes.data.options) {
      setLoading(false);
      const errMsg = optionsRes.success
        ? "No passkey found for this account."
        : (optionsRes as { error: string }).error;
      setError(errMsg);
      return;
    }
    try {
      const assertion = await runPasskeyAuthentication(optionsRes.data.options);
      const verifyRes = await postLoginPasskeyVerify({
        email: trimmed,
        response: assertion,
        sessionTtlMinutes: 15,
      });
      setLoading(false);
      if (isAuthSuccess(verifyRes)) {
        const result = await signIn("credentials", {
          token: verifyRes.data.token,
          admin: JSON.stringify(verifyRes.data.admin),
          expiresAt: verifyRes.data.expiresAt,
          redirect: false,
        });
        if (result?.ok) {
          try {
            await clearMerchantPortalHttpOnlyCookie();
          } catch {
            /* non-fatal */
          }
          clearBusinessAccessToken();
          dispatch(clearMerchantPortal());
          window.location.href = "/";
        } else {
          setError(result?.error ?? "Session sign-in failed");
        }
        return;
      }
      setError((verifyRes as { error: string }).error ?? "Verification failed");
    } catch (err) {
      setLoading(false);
      setError(formatWebAuthnClientError(err));
    }
  };

  const needsEmail = !initialEmail;

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        Sign in with passkey
      </h1>
      <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
        Use the passkey you registered for this admin account. You must have
        completed authenticator setup and added a passkey from the dashboard
        or first-time setup.
      </p>
      <form onSubmit={(e) => void handlePasskey(e)} className="mt-8 space-y-4">
        {needsEmail && (
          <Input
            type="email"
            autoComplete="username webauthn"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setError(null);
            }}
            className="h-12 text-base"
            required
          />
        )}
        {!needsEmail && (
          <p className="text-caption text-muted-foreground">{initialEmail}</p>
        )}
        {error && (
          <p className="text-caption text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign in with passkey"}
        </Button>
      </form>
      <p className="mt-8 text-center">
        <Link
          href="/login"
          className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Back
        </Link>
      </p>
    </>
  );
}

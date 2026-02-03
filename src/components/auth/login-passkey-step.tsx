"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  postLoginPasskeyOptions,
  postLoginPasskeyVerify,
} from "@/lib/auth-api";
import { normalizeRequestOptions } from "@/lib/webauthn-options";
import { isAuthSuccess } from "@/types/auth";

export function LoginPasskeyStep({ email: initialEmail }: { email: string }) {
  const router = useRouter();
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
    setError(null);
    setLoading(true);
    const optionsRes = await postLoginPasskeyOptions({ email: trimmed });
    if (!isAuthSuccess(optionsRes) || !optionsRes.data.options) {
      setLoading(false);
      setError(
        optionsRes.success ? "No passkey found" : (optionsRes as { error: string }).error
      );
      return;
    }
    try {
      const options = normalizeRequestOptions(
        optionsRes.data.options as Parameters<typeof normalizeRequestOptions>[0]
      );
      const credential = await navigator.credentials.get({
        publicKey: options,
      });
      if (!credential) {
        setLoading(false);
        setError("Sign-in was cancelled");
        return;
      }
      const verifyRes = await postLoginPasskeyVerify({
        email: trimmed,
        response: credential as unknown as Record<string, unknown>,
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
          router.replace("/");
        } else {
          setError(result?.error ?? "Session sign-in failed");
        }
        return;
      }
      setError((verifyRes as { error: string }).error ?? "Verification failed");
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Passkey sign-in failed");
    }
  };

  const needsEmail = !initialEmail;

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        Sign in with passkey
      </h1>
      <form onSubmit={handlePasskey} className="mt-8 space-y-4">
        {needsEmail && (
          <Input
            type="email"
            autoComplete="email"
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

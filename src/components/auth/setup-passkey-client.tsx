"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import Link from "next/link";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPasskeyOptions, postPasskeyVerify } from "@/lib/auth-api";
import {
  formatWebAuthnClientError,
  isWebAuthnAvailable,
  runPasskeyRegistration,
  sanitizePasskeyApiError,
} from "@/lib/webauthn-client";
import { isAuthSuccess } from "@/types/auth";

export function SetupPasskeyClient() {
  const router = useRouter();
  const token = useSelector((s: RootState) => s.auth.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [passkeyLabel, setPasskeyLabel] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!token) {
      router.replace("/login?signup=1");
    }
  }, [token, router]);

  const handleSetup = async () => {
    if (!token) return;
    if (!isWebAuthnAvailable()) {
      setError(
        "Passkeys are not supported in this browser. Skip for now and add one later from Account settings."
      );
      return;
    }
    setError(null);
    setLoading(true);
    const optionsRes = await getPasskeyOptions();
    if (!isAuthSuccess(optionsRes) || !optionsRes.data.options) {
      setLoading(false);
      setError(
        optionsRes.success
          ? "Could not get passkey options from the server."
          : sanitizePasskeyApiError((optionsRes as { error?: string }).error)
      );
      return;
    }
    try {
      const attestation = await runPasskeyRegistration(optionsRes.data.options);
      const label = passkeyLabel.trim().slice(0, 80);
      const verifyRes = await postPasskeyVerify({
        response: attestation,
        name: label.length > 0 ? label : undefined,
      });
      setLoading(false);
      if (isAuthSuccess(verifyRes)) {
        setDone(true);
        setTimeout(() => {
          router.replace("/");
        }, 1000);
      } else {
        setError(sanitizePasskeyApiError((verifyRes as { error?: string }).error));
      }
    } catch (err) {
      setLoading(false);
      setError(formatWebAuthnClientError(err));
    }
  };

  if (!token) return null;

  if (done) {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          Passkey added
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
          Taking you to the dashboard…
        </p>
      </>
    );
  }

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        Set up passkey
      </h1>
      <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
        Optional: add a passkey for faster sign-in with your device or security
        key. You can skip and add one anytime under Account.
      </p>
      <div className="mt-6 space-y-2">
        <Label htmlFor="setup-passkey-label">Passkey label (optional)</Label>
        <Input
          id="setup-passkey-label"
          type="text"
          autoComplete="off"
          placeholder="e.g. MacBook, YubiKey"
          maxLength={80}
          value={passkeyLabel}
          onChange={(e) => setPasskeyLabel(e.target.value)}
          disabled={loading}
          className="h-11"
        />
      </div>
      {error && (
        <p className="mt-4 text-caption text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        onClick={() => void handleSetup()}
        className="mt-8 h-12 w-full text-base"
        disabled={loading}
      >
        {loading ? "Setting up…" : "Add passkey"}
      </Button>
      <p className="mt-6 text-center">
        <Link
          href="/"
          className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Skip for now
        </Link>
      </p>
    </>
  );
}

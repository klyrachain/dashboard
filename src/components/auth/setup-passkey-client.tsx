"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { Button } from "@/components/ui/button";
import { getPasskeyOptions, postPasskeyVerify } from "@/lib/auth-api";
import { normalizeCreateOptions } from "@/lib/webauthn-options";
import { isAuthSuccess } from "@/types/auth";

export function SetupPasskeyClient() {
  const router = useRouter();
  const token = useSelector((s: RootState) => s.auth.token);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!token) {
      router.replace("/login?signup=1");
      return;
    }
  }, [token, router]);

  const handleSetup = async () => {
    if (!token) return;
    setError(null);
    setLoading(true);
    const optionsRes = await getPasskeyOptions();
    if (!isAuthSuccess(optionsRes) || !optionsRes.data.options) {
      setLoading(false);
      setError(optionsRes.success ? "Could not get options" : (optionsRes as { error: string }).error);
      return;
    }
    try {
      const options = normalizeCreateOptions(optionsRes.data.options);
      const credential = await navigator.credentials.create(options);
      if (!credential) {
        setLoading(false);
        setError("Passkey creation was cancelled");
        return;
      }
      const verifyRes = await postPasskeyVerify({
        response: credential as unknown as Record<string, unknown>,
        name: "Device",
      });
      setLoading(false);
      if (isAuthSuccess(verifyRes)) {
        setDone(true);
        setTimeout(() => router.replace("/"), 1000);
      } else {
        setError((verifyRes as { error: string }).error ?? "Verification failed");
      }
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : "Passkey setup failed");
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
        Use your device or browser to sign in next time. You’ll need to add one now to continue.
      </p>
      {error && (
        <p className="mt-4 text-caption text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button
        onClick={handleSetup}
        className="mt-8 h-12 w-full text-base"
        disabled={loading}
      >
        {loading ? "Setting up…" : "Add passkey"}
      </Button>
    </>
  );
}

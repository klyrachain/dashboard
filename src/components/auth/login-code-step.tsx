"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { postLogin } from "@/lib/auth-api";
import { isAuthSuccess } from "@/types/auth";

const DRAFT_KEY = "klyra_login_draft";

export function LoginCodeStep({ email }: { email: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = searchParams.get("signup") === "1";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || code.trim().length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    let password = "";
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as { email?: string; password?: string };
        if (draft.email === email) password = draft.password ?? "";
        sessionStorage.removeItem(DRAFT_KEY);
      }
    } catch {
      // ignore
    }
    if (!password) {
      setError("Session expired. Go back and enter your password again.");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await postLogin({
      email,
      password,
      code: code.trim(),
      sessionTtlMinutes: 15,
    });
    setLoading(false);
    if (isAuthSuccess(res)) {
      const result = await signIn("credentials", {
        token: res.data.token,
        admin: JSON.stringify(res.data.admin),
        expiresAt: res.data.expiresAt,
        redirect: false,
      });
      if (result?.ok) {
        const target = signup ? "/setup-passkey" : "/";
        window.location.href = target;
      } else {
        setError(result?.error ?? "Session sign-in failed");
      }
      return;
    }
    setError((res as { error: string }).error ?? "Sign in failed");
  };

  if (!email) return null;

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        Enter your verification code
      </h1>
      <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
        Open your authenticator app and enter the 6-digit code.
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          maxLength={6}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.replace(/\D/g, ""));
            setError(null);
          }}
          className="h-12 text-center text-xl tracking-[0.5em]"
          required
        />
        {error && (
          <p className="text-caption text-destructive" role="alert">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="h-12 w-full text-base"
          disabled={loading || code.trim().length !== 6}
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>
      <p className="mt-8 text-center">
        <Link
          href={
            signup
              ? `/login/password?email=${encodeURIComponent(email)}&signup=1`
              : `/login/password?email=${encodeURIComponent(email)}`
          }
          className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Back
        </Link>
      </p>
    </>
  );
}

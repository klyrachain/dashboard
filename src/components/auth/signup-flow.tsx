"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getInvite, postSetup, postSetupConfirmTotp } from "@/lib/auth-api";
import { isAuthSuccess } from "@/types/auth";
import type { InviteData, SetupData } from "@/types/auth";

const SETUP_STORAGE_KEY = "klyra_signup_setup";

type Step = "invite" | "password" | "totp" | "success";

type SignupFlowProps = {
  token: string | undefined;
  step: string;
};

export function SignupFlow({ token, step: stepParam }: SignupFlowProps) {
  const router = useRouter();
  const step: Step =
    stepParam === "password" || stepParam === "totp" || stepParam === "success"
      ? stepParam
      : "invite";

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [setupData, setSetupData] = useState<SetupData | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token?.trim()) return;
    if (step !== "invite") return;
    setLoading(true);
    setError(null);
    getInvite(token).then((res) => {
      setLoading(false);
      if (isAuthSuccess(res)) {
        setInvite(res.data);
      } else {
        setError(
          (res as { code?: string }).code === "INVALID_INVITE"
            ? "Invalid or expired invite link."
            : (res as { error: string }).error
        );
      }
    });
  }, [token, step]);

  useEffect(() => {
    if (step !== "totp" || !token) return;
    try {
      const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as SetupData;
        if (data.adminId) setSetupData(data);
      }
    } catch {
      // ignore
    }
  }, [step, token]);

  const goTo = (s: Step) => {
    if (!token) return;
    if (s === "invite") router.push(`/signup?token=${encodeURIComponent(token)}`);
    else router.push(`/signup?token=${encodeURIComponent(token)}&step=${s}`);
  };

  const handleInviteNext = () => {
    if (!invite) return;
    goTo("password");
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token?.trim() || !invite) return;
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await postSetup({ inviteToken: token, password });
    setLoading(false);
    if (isAuthSuccess(res)) {
      try {
        sessionStorage.setItem(SETUP_STORAGE_KEY, JSON.stringify(res.data));
      } catch {
        // ignore
      }
      setSetupData(res.data);
      goTo("totp");
    } else {
      setError((res as { error: string }).error ?? "Setup failed");
    }
  };

  const handleTotpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = setupData ?? (() => {
      try {
        const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SetupData) : null;
      } catch {
        return null;
      }
    })();
    if (!data || totpCode.trim().length !== 6) {
      setError("Enter the 6-digit code from your authenticator app");
      return;
    }
    setError(null);
    setLoading(true);
    const res = await postSetupConfirmTotp({
      adminId: data.adminId,
      code: totpCode.trim(),
    });
    setLoading(false);
    if (isAuthSuccess(res)) {
      try {
        sessionStorage.removeItem(SETUP_STORAGE_KEY);
      } catch {
        // ignore
      }
      goTo("success");
      setTimeout(() => router.replace("/login?signup=1"), 1500);
    } else {
      setError(
        (res as { code?: string }).code === "INVALID_CODE"
          ? "Invalid code. Try again."
          : (res as { error: string }).error
      );
    }
  };

  if (!token?.trim()) {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          Sign up
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
          Sign up is by invite only. Use the link from your admin.
        </p>
        <Button asChild className="mt-8 h-12 w-full text-base">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </>
    );
  }

  if (loading && step === "invite" && !invite) {
    return (
      <p className="text-center text-caption text-muted-foreground">Loading invite…</p>
    );
  }

  if (error && step === "invite" && !invite) {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          Invalid invite
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">{error}</p>
        <Button asChild className="mt-8 h-12 w-full text-base">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </>
    );
  }

  if (step === "invite" && invite) {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          You’re invited
        </h1>
        <p className="mt-4 text-caption text-muted-foreground">
          {invite.email} · {invite.role}
        </p>
        <Button
          onClick={handleInviteNext}
          className="mt-8 h-12 w-full text-base"
        >
          Next
        </Button>
      </>
    );
  }

  if (step === "password" && invite) {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          Create a password
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
          At least 8 characters
        </p>
        <form onSubmit={handlePasswordSubmit} className="mt-8 space-y-4">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(null);
            }}
            className="h-12 text-base"
            minLength={8}
            required
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => {
              setConfirmPassword(e.target.value);
              setError(null);
            }}
            className="h-12 text-base"
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
            disabled={loading}
          >
            {loading ? "Creating…" : "Next"}
          </Button>
        </form>
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => goTo("invite")}
            className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            Back
          </button>
        </p>
      </>
    );
  }

  if (step === "totp" && (setupData || stepParam === "totp")) {
    const data = setupData ?? (() => {
      try {
        const raw = sessionStorage.getItem(SETUP_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as SetupData) : null;
      } catch {
        return null;
      }
    })();
    if (!data) {
      router.replace(`/signup?token=${encodeURIComponent(token!)}&step=password`);
      return null;
    }
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          Set up Authentication key
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
          Add this key to your authenticator app (Google Authenticator, Authy, etc.) by scanning the QR code or entering the secret manually. Then enter the 6-digit code below.
        </p>
        <div className="mt-8 flex flex-col items-center gap-6">
          {data.totpUri ? (
            <div className="flex flex-col items-center gap-3">
              {/* <span className="text-caption font-medium text-foreground">
                Authentication key (scan with app)
              </span> */}
              <div className="rounded-lg border border-border bg-card p-4">
                <QRCodeSVG
                  value={data.totpUri}
                  size={192}
                  level="M"
                  marginSize={1}
                  role="img"
                  aria-label="QR code for Authentication key — scan with your authenticator app"
                />
              </div>
            </div>
          ) : null}
          <div className="w-full space-y-2">
            <span className="text-caption font-medium text-foreground">
              Authentication key (manual entry)
            </span>
            <div className="rounded-lg bg-muted p-4 font-mono text-caption break-all">
              {data.totpSecret}
            </div>
          </div>
        </div>
        <form onSubmit={handleTotpSubmit} className="mt-8 space-y-4">
          <Input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            value={totpCode}
            onChange={(e) => {
              setTotpCode(e.target.value.replace(/\D/g, ""));
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
            disabled={loading || totpCode.trim().length !== 6}
          >
            {loading ? "Verifying…" : "Next"}
          </Button>
        </form>
        <p className="mt-8 text-center">
          <button
            type="button"
            onClick={() => goTo("password")}
            className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
          >
            Back
          </button>
        </p>
      </>
    );
  }

  if (step === "success") {
    return (
      <>
        <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
          You’re all set
        </h1>
        <p className="mt-4 text-caption text-muted-foreground leading-relaxed">
          Redirecting you to sign in…
        </p>
      </>
    );
  }

  return null;
}

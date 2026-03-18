"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const DRAFT_KEY = "klyra_login_draft";

export function LoginPasswordStep({ email }: { email: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = searchParams.get("signup") === "1";
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) router.replace("/login");
  }, [email, router]);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError("Enter your password");
      return;
    }
    setError(null);
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ email, password }));
    } catch {
      // ignore
    }
    const q = new URLSearchParams({ email });
    if (signup) q.set("signup", "1");
    router.push(`/login/code?${q.toString()}`);
  };

  if (!email) return null;

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        Enter your password
      </h1>
      <p className="mt-4 text-caption text-muted-foreground">{email}</p>
      <form onSubmit={handleNext} className="mt-8 space-y-4">
        <Input
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
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
        <Button type="submit" className="h-12 w-full text-base">
          Next
        </Button>
      </form>
      <p className="mt-8 text-center">
        <Link
          href={signup ? "/login?signup=1" : "/login"}
          className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Back
        </Link>
      </p>
    </>
  );
}

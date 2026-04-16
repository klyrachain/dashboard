"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function LoginEmailStep() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const signup = searchParams.get("signup") === "1";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email");
      return;
    }
    setError(null);
    const q = new URLSearchParams({ email: trimmed });
    if (signup) q.set("signup", "1");
    router.push(`/login/password?${q.toString()}`);
  };

  return (
    <>
      <h1 className="text-heading font-semibold tracking-tight text-foreground leading-tight">
        What’s your email?
      </h1>
      <form onSubmit={handleNext} className="mt-8 space-y-4">
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
          href={email.trim() ? `/login/passkey?email=${encodeURIComponent(email.trim())}` : "/login/passkey"}
          className="text-caption text-muted-foreground underline hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
        >
          Sign in with passkey instead
        </Link>
      </p>
    </>
  );
}

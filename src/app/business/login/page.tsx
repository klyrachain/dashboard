"use client";

import { Suspense } from "react";
import { BusinessSigninFlow } from "@/components/business-auth/business-signin-flow";
import { Loader2 } from "lucide-react";

export default function BusinessLoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[50vh] items-center justify-center"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-8 shrink-0 animate-spin text-primary" aria-hidden />
        </div>
      }
    >
      <BusinessSigninFlow />
    </Suspense>
  );
}


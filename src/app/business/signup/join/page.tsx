import { Suspense } from "react";
import { BusinessSignupJoinClient } from "@/components/business-signup-join-client";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Create account to join team | Morapay",
  description: "Sign up without creating a new business — finish joining from your invite.",
};

export default function BusinessSignupJoinPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center bg-zinc-50"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-8 shrink-0 animate-spin text-zinc-600" aria-hidden />
        </div>
      }
    >
      <BusinessSignupJoinClient />
    </Suspense>
  );
}

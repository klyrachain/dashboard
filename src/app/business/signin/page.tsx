import { Suspense } from "react";
import { BusinessSigninFlow } from "@/components/BusinessSigninFlow";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Business sign in | Morapay",
  description: "Sign in to your business account",
};

export default function BusinessSigninPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center bg-zinc-50"
          role="status"
          aria-live="polite"
        >
          <Loader2
            className="size-8 shrink-0 animate-spin text-zinc-600"
            aria-hidden
          />
        </div>
      }
    >
      <BusinessSigninFlow />
    </Suspense>
  );
}

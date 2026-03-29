import { Suspense } from "react";
import { BusinessSignupFlow } from "@/components/BusinessSignupFlow";
import { Loader2 } from "lucide-react";

export const metadata = {
  title: "Create business account | Morapay",
  description: "Create your Morapay business account",
};

export default function BusinessSignupPage() {
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
      <BusinessSignupFlow />
    </Suspense>
  );
}

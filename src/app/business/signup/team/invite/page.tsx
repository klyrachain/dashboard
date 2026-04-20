import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { BusinessTeamInviteAcceptClient } from "@/components/business-team-invite-accept";

export const metadata = {
  title: "Accept team invite | Morapay",
  description: "Join a Morapay business team with your invite link",
};

export default function BusinessTeamInvitePage() {
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
      <BusinessTeamInviteAcceptClient />
    </Suspense>
  );
}

import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAccessContext } from "@/lib/data-access";
import { MerchantSettlementsClient } from "@/components/merchant/merchant-settlements-client";

type SettlementsPageProps = {
  searchParams: Promise<{ page?: string; status?: string; id?: string }>;
};

/** Merchant payouts via `GET /api/v1/merchant/settlements`. Platform: /connect/settlements. */
export default async function MerchantSettlementsPage({
  searchParams,
}: SettlementsPageProps) {
  const sp = await searchParams;
  const access = await getAccessContext();
  if (!access.ok || access.context?.type !== "merchant") {
    redirect("/connect/settlements");
  }

  const businessName = access.context?.business?.name;

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Payouts</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Withdraw your funds to your bank, Mobile Money, or crypto wallet.
        </p>
        {businessName ? (
          <p className="font-secondary text-caption text-muted-foreground">
            <span className="font-medium text-foreground">{businessName}</span>
          </p>
        ) : null}
        {sp.status && sp.status !== "all" ? (
          <p className="font-secondary text-caption text-muted-foreground" role="status">
            Filtered by status: <span className="font-mono">{sp.status}</span>
          </p>
        ) : null}
      </header>
      <Suspense
        fallback={
          <div
            className="flex items-center justify-center py-12 text-muted-foreground"
            role="status"
            aria-live="polite"
          >
            <Loader2 className="size-8 shrink-0 animate-spin" aria-hidden />
          </div>
        }
      >
        <MerchantSettlementsClient />
      </Suspense>
    </div>
  );
}

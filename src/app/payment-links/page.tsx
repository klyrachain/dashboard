import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAccessContext } from "@/lib/data-access";
import { getPaymentLinks } from "@/lib/data-payment-links";
import { PaymentLinksTable } from "@/components/payment-links/payment-links-table";
import { MerchantPaymentLinksClient } from "@/components/merchant/merchant-payment-links-client";

export default async function PaymentLinksPage() {
  const access = await getAccessContext();

  if (access.ok && access.context?.type === "merchant") {
    return (
      <div className="space-y-6 font-primary text-body">
        <header className="space-y-1">
          <h1 className="text-display font-semibold tracking-tight">
            Payment links
          </h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            Share a link and get paid. Use Test mode in the header to try safely.
          </p>
        </header>
        <Suspense
          fallback={
            <div className="flex justify-center py-12 text-muted-foreground" role="status">
              <Loader2 className="size-8 animate-spin" aria-hidden />
            </div>
          }
        >
          <MerchantPaymentLinksClient />
        </Suspense>
      </div>
    );
  }

  const { items, error } = await getPaymentLinks({ page: 1, limit: 200 });

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Payment Links
        </h1>
        <p className="font-secondary text-caption text-muted-foreground">
          View and manage payment link requests sent to customers.
        </p>
      </div>
      {error ? (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {error}
        </div>
      ) : null}
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        <PaymentLinksTable data={items} />
      </div>
    </div>
  );
}

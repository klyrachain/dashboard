import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { getAccessContext, isMerchantPortalSessionReady } from "@/lib/data-access";
import { getPaymentLinks } from "@/lib/data-payment-links";
import { PaymentLinksTable } from "@/components/payment-links/payment-links-table";
import { MerchantPaymentLinksClient } from "@/components/merchant/merchant-payment-links-client";

export default async function PaymentLinksPage() {
  const access = await getAccessContext();
  const merchantPortalCookies = await isMerchantPortalSessionReady();

  if (
    merchantPortalCookies ||
    (access.ok && access.context?.type === "merchant")
  ) {
    return (
      <div className="space-y-6 font-primary text-body">
        <header className="space-y-1 min-w-0">
          <h1 className="text-display font-semibold tracking-tight">
            Payment links
          </h1>
          <p className="font-secondary text-caption text-muted-foreground max-w-prose">
            Share a link and get paid.
          </p>
        </header>
        <Suspense
          fallback={
            <div
              className="flex min-h-[12rem] items-center justify-center rounded-lg border border-slate-200 bg-white py-12 text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="size-8 shrink-0 animate-spin" aria-hidden />
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
      <header className="space-y-1 min-w-0">
        <h1 className="text-display font-semibold tracking-tight">
          Payment links
        </h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          View and manage payment link requests sent to customers.
        </p>
      </header>
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

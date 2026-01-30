import { getPaymentLinks } from "@/lib/data-payment-links";
import { PaymentLinksTable } from "@/components/payment-links/payment-links-table";

export default async function PaymentLinksPage() {
  const data = await getPaymentLinks();

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
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        <PaymentLinksTable data={data} />
      </div>
    </div>
  );
}

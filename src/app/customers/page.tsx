import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAccessContext } from "@/lib/data-access";
import { MerchantCustomersClient } from "@/components/merchant/merchant-customers-client";

export default async function MerchantCustomersPage() {
  const access = await getAccessContext();
  if (!access.ok || access.context?.type !== "merchant") {
    redirect("/users");
  }

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Customers</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          Everyone who paid you, plus contacts you save in CRM.
        </p>
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
        <MerchantCustomersClient />
      </Suspense>
    </div>
  );
}

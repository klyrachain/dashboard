import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getAccessContext } from "@/lib/data-access";
import { MerchantProductsClient } from "@/components/merchant/merchant-products-client";

export default async function ProductsPage() {
  const access = await getAccessContext();
  if (!access.ok || access.context?.type !== "merchant") {
    redirect("/inventory");
  }

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Products</h1>
        <p className="font-secondary text-caption text-muted-foreground max-w-prose">
          What you sell in checkout and payment links.
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
        <MerchantProductsClient />
      </Suspense>
    </div>
  );
}

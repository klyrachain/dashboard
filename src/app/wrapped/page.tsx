import { MerchantWrappedPanel } from "@/components/wrapped/merchant-wrapped-panel";

export default function WrappedPage() {
  return (
    <main className="space-y-4">
      <header>
        <h1 className="text-2xl font-semibold">Year in review</h1>
        <p className="text-sm text-muted-foreground">
          Wrapped foundations for business analytics.
        </p>
      </header>
      <MerchantWrappedPanel />
    </main>
  );
}

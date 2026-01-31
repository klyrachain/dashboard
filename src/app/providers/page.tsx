import { ProviderRoutingTable } from "@/components/providers/provider-routing-table";

export default function ProvidersPage() {
  return (
    <div className="space-y-8 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">
          Provider routing
        </h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          List providers, status, operational, enabled, API key (masked), priority, and fee. Update key via rotate-key.
        </p>
      </div>
      <ProviderRoutingTable />
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryAssetRow } from "@/lib/data-inventory";

function EmptyInventoryState() {
  return (
    <Card className="bg-white">
      <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
          <span className="text-2xl text-slate-400" aria-hidden>
            —
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600">No data</p>
          <p className="text-xs text-slate-500">
            No inventory assets. Balances will appear here when data is
            available from Core.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryCards({ assets }: { assets: InventoryAssetRow[] }) {
  if (assets.length === 0) {
    return <EmptyInventoryState />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {assets.map((asset) => (
        <Card key={asset.id}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {asset.token} on {asset.chain}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">{asset.balance}</p>
            <p className="text-xs text-muted-foreground">
              Updated {new Date(asset.updatedAt).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { InventoryAssetRow } from "@/lib/data-inventory";

export function InventoryCards({ assets }: { assets: InventoryAssetRow[] }) {
  if (assets.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No inventory assets. Balances will appear here.
      </p>
    );
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

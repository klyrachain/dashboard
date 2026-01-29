import { InventoryCards } from "@/components/inventory/inventory-cards";
import { InventoryChart } from "@/components/inventory/inventory-chart";
import { getInventoryAssets, getInventoryHistory } from "@/lib/data-inventory";

export default async function InventoryPage() {
  const [assets, history] = await Promise.all([
    getInventoryAssets(),
    getInventoryHistory(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Treasury balances and inventory history by chain/token.
        </p>
      </div>

      <InventoryCards assets={assets} />
      <InventoryChart data={history} />
    </div>
  );
}

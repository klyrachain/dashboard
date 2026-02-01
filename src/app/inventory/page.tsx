import { InventoryAssetContainer } from "@/components/inventory/inventory-asset-container";
import { InventoryHistoryTable } from "@/components/inventory/inventory-history-table";
import { getInventoryHistoryList } from "@/lib/data-inventory";

type InventoryPageProps = {
  searchParams: Promise<{ page?: string; limit?: string; assetId?: string; chain?: string }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit ?? "20", 10) || 20));
  const assetId = params.assetId?.trim() || undefined;
  const chain = params.chain?.trim() || undefined;

  const historyList = await getInventoryHistoryList({ page, limit, assetId, chain });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground">
          Treasury balances and inventory history by chain/token.
        </p>
      </div>

      <InventoryAssetContainer />
      <InventoryHistoryTable
        result={historyList}
        currentPage={page}
        currentLimit={limit}
        assetId={assetId}
        chain={chain}
      />
    </div>
  );
}

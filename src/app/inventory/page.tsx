import { InventoryOverview } from "@/components/inventory/inventory-overview";
import { InventoryHistoryTable } from "@/components/inventory/inventory-history-table";
import { InventoryLotsSection } from "@/components/inventory/inventory-lots-section";
import { getInventoryHistoryList } from "@/lib/data-inventory";
import { getLotsList, getChains, getTokens } from "@/lib/data-lots-chains";

const LOTS_PAGE_SIZE_DEFAULT = 20;
const LOTS_PAGE_SIZE_MAX = 100;

type InventoryPageProps = {
  searchParams: Promise<{
    page?: string;
    limit?: string;
    assetId?: string;
    chain?: string;
    lotsPage?: string;
    lotsLimit?: string;
  }>;
};

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(params.limit ?? "20", 10) || 20));
  const lotsPage = Math.max(1, parseInt(params.lotsPage ?? "1", 10) || 1);
  const lotsLimit = Math.min(
    LOTS_PAGE_SIZE_MAX,
    Math.max(1, parseInt(params.lotsLimit ?? String(LOTS_PAGE_SIZE_DEFAULT), 10) || LOTS_PAGE_SIZE_DEFAULT)
  );
  const assetId = params.assetId?.trim() || undefined;
  const chain = params.chain?.trim() || undefined;

  const [historyList, lotsResult, chains, tokens] = await Promise.all([
    getInventoryHistoryList({ page, limit, assetId, chain }),
    getLotsList({
      page: lotsPage,
      limit: lotsLimit,
      chain: chain ?? undefined,
      assetId: assetId ?? undefined,
    }),
    getChains(),
    getTokens(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inventory</h1>
        <p className="text-muted-foreground text-sm">
          Treasury balances, lots, chains & tokens, and inventory history.
        </p>
      </div>

      <InventoryOverview lotsResult={lotsResult} chains={chains} tokens={tokens} />

      <div className="flex gap-4 overflow-hidden">
        <InventoryHistoryTable
          result={historyList}
          currentPage={page}
          currentLimit={limit}
          assetId={assetId}
          chain={chain}
        />
        <InventoryLotsSection
          result={lotsResult}
          currentLotsPage={lotsPage}
          currentLotsLimit={lotsLimit}
          baseQuery={{ page, limit, assetId, chain }}
          showSummary={false}
        />
      </div>
    </div>
  );
}

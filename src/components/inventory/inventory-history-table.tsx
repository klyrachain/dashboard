import { format } from "date-fns";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type {
  InventoryHistoryRow,
  InventoryHistoryListResult,
} from "@/lib/data-inventory";

type InventoryHistoryTableProps = {
  result: InventoryHistoryListResult;
  /** Current page (1-based) for pagination links. */
  currentPage: number;
  /** Optional assetId filter (for link query). */
  assetId?: string;
  /** Optional chain filter (for link query). */
  chain?: string;
};

function buildQuery(
  page: number,
  assetId?: string,
  chain?: string
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (assetId) params.set("assetId", assetId);
  if (chain) params.set("chain", chain);
  const q = params.toString();
  return q ? `?${q}` : "";
}

function EmptyHistoryState() {
  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
          <p className="text-sm font-medium text-slate-600">No history records</p>
          <p className="text-xs text-slate-500">
            History will appear here when data is available from Core.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryHistoryTable({
  result,
  currentPage,
  assetId,
  chain,
}: InventoryHistoryTableProps) {
  const { items, meta } = result;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const prevQuery = buildQuery(currentPage - 1, assetId, chain);
  const nextQuery = buildQuery(currentPage + 1, assetId, chain);

  if (items.length === 0 && currentPage === 1) {
    return <EmptyHistoryState />;
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
        <p className="text-sm text-muted-foreground">
          All inventory history. Filter by asset or chain via query params.
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead className="text-right">Initial price</TableHead>
                <TableHead className="text-right">Quote price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((row: InventoryHistoryRow) => (
                <TableRow key={row.id}>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(row.createdAt, "yyyy-MM-dd HH:mm")}
                  </TableCell>
                  <TableCell className="font-medium">{row.type}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.asset.symbol} on {row.asset.chain}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.amount}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {row.quantity}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.initialPurchasePrice}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {row.providerQuotePrice}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Page {meta.page} of {totalPages} · {meta.total} total
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage <= 1}
            >
              <Link href={`/inventory${prevQuery}`}>Previous</Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              disabled={currentPage >= totalPages}
            >
              <Link href={`/inventory${nextQuery}`}>Next</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

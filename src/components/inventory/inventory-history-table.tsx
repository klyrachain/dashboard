"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  InventoryHistoryRow,
  InventoryHistoryListResult,
} from "@/lib/data-inventory";
import { ExportDataModal } from "@/components/export-data-modal";
import type { ExportColumn } from "@/lib/export-data";
import { FileDown, Loader2, Search } from "lucide-react";

const INVENTORY_HISTORY_EXPORT_COLUMNS: ExportColumn[] = [
  { id: "createdAt", label: "Date" },
  { id: "type", label: "Type" },
  { id: "assetDisplay", label: "Asset" },
  { id: "amount", label: "Amount" },
  { id: "quantity", label: "Quantity" },
  { id: "initialPurchasePrice", label: "Initial price" },
  { id: "providerQuotePrice", label: "Quote price" },
];

const HISTORY_PAGE_SIZE_OPTIONS = [15, 20, 50, 100] as const;

type InventoryHistoryTableProps = {
  result: InventoryHistoryListResult;
  /** Current page (1-based) for pagination links. */
  currentPage: number;
  /** Current limit (rows per page). */
  currentLimit: number;
  /** Optional assetId filter (for link query). */
  assetId?: string;
  /** Optional chain filter (for link query). */
  chain?: string;
};

function buildQuery(
  page: number,
  limit: number,
  assetId?: string,
  chain?: string
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (limit !== 20) params.set("limit", String(limit));
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
  currentLimit,
  assetId,
  chain,
}: InventoryHistoryTableProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const { items, meta } = result;

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (row) =>
        (row.id && row.id.toLowerCase().includes(q)) ||
        (row.assetId && row.assetId.toLowerCase().includes(q)) ||
        (row.type && row.type.toLowerCase().includes(q)) ||
        (row.asset?.symbol && row.asset.symbol.toLowerCase().includes(q)) ||
        (row.asset?.chain && row.asset.chain.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const prevQuery = buildQuery(currentPage - 1, currentLimit, assetId, chain);
  const nextQuery = buildQuery(currentPage + 1, currentLimit, assetId, chain);

  const handleLimitChange = (value: string) => {
    const limit = Number(value);
    const query = buildQuery(1, limit, assetId, chain);
    router.push(`/inventory${query}`);
  };

  const [exportModalOpen, setExportModalOpen] = useState(false);
  const exportData = useMemo((): Record<string, unknown>[] => {
    return filteredItems.map((row) => ({
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt ?? ""),
      type: row.type ?? "",
      assetDisplay: row.asset
        ? `${row.asset.symbol} on ${row.asset.chain}`
        : "",
      amount: row.amount ?? "",
      quantity: row.quantity ?? "",
      initialPurchasePrice: row.initialPurchasePrice ?? "",
      providerQuotePrice: row.providerQuotePrice ?? "",
    }));
  }, [filteredItems]);

  if (items.length === 0 && currentPage === 1) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>Inventory History</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-2"
            aria-label="Refresh history"
          >
            <Loader2 className="size-4" aria-hidden />
            Refresh
          </Button>
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <p className="text-sm font-medium text-slate-600">No history records</p>
            <p className="text-xs text-slate-500">
              History will appear here when data is available from Core.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle>Inventory History</CardTitle>
        <p className="text-sm text-muted-foreground">
          All inventory history. Filter by asset or chain via query params.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative max-w-md">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search by ID, asset, type, chain…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 border border-slate-200 bg-white"
              aria-label="Search history"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="gap-2"
            aria-label="Export history"
          >
            <FileDown className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.refresh()}
            className="gap-2"
            aria-label="Refresh history"
          >
            <Loader2 className="size-4" aria-hidden />
            Refresh
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Rows per page</span>
            <Select
              value={String(currentLimit)}
              onValueChange={handleLimitChange}
            >
              <SelectTrigger className="w-[90px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HISTORY_PAGE_SIZE_OPTIONS.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
              {filteredItems.map((row: InventoryHistoryRow) => (
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
        {filteredItems.length === 0 && searchQuery.trim() !== "" ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No rows on this page match your search.
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
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
      <ExportDataModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        title="Export inventory history"
        columns={INVENTORY_HISTORY_EXPORT_COLUMNS}
        data={exportData}
        filenamePrefix="inventory-history"
      />
    </Card>
  );
}

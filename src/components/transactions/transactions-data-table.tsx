"use client";

import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, FileDown, Loader2, RotateCcw, Search } from "lucide-react";
import { ExportDataModal } from "@/components/export-data-modal";
import type { ExportColumn } from "@/lib/export-data";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TransactionStatus, TransactionType } from "@/types/enums";
import { refreshTransactionsAction, retryTransaction } from "@/app/transactions/actions";
import type { TransactionRow } from "@/lib/data-transactions";

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case TransactionStatus.COMPLETED:
      return "success";
    case TransactionStatus.FAILED:
      return "destructive";
    case TransactionStatus.PENDING:
    case TransactionStatus.ACTIVE:
      return "secondary";
    default:
      return "outline";
  }
}

/** Preset page sizes for the dropdown; user can also enter any number in the custom input. */
const PAGE_SIZE_PRESETS = [15, 50, 100, 150, 200] as const;
const DEFAULT_PAGE_SIZE = 15;

/** localStorage key for persisting column visibility so it survives refresh. */
const COLUMN_VISIBILITY_STORAGE_KEY = "klyra-transactions-column-visibility";

/** Default visible columns: ID, Type, Status, amounts/fee, tokens/chains, providers, Created, Actions. */
const defaultColumnVisibility: VisibilityState = {
  fee: true,
  feeInUsd: true,
  fromChain: true,
  toChain: true,
  exchangeRate: false,
  fTokenPriceUsd: false,
  tTokenPriceUsd: false,
  fromIdentifier: false,
  toIdentifier: false,
  fromType: false,
  toType: false,
  fromUserId: false,
  toUserId: false,
  requestId: false,
  updatedAt: false,
};

const columns: ColumnDef<TransactionRow>[] = [
  {
    accessorKey: "id",
    header: "ID",
    meta: { headerLabel: "ID" },
    cell: ({ row }) => {
      const id = row.original.id ?? "";
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground">
            {id.slice(0, 8)}…
          </span>
          <CopyButton value={id} label="Copy transaction ID" />
        </div>
      );
    },
  },
  {
    accessorKey: "type",
    header: "Type",
    meta: { headerLabel: "Type" },
  },
  {
    accessorKey: "status",
    header: "Status",
    meta: { headerLabel: "Status" },
    cell: ({ row }) => {
      const status = row.getValue("status") as string;
      return <Badge variant={getStatusVariant(status)}>{status}</Badge>;
    },
  },
  {
    accessorKey: "fromAmount",
    header: "From amount",
    meta: { headerLabel: "From amount" },
  },
  {
    accessorKey: "toAmount",
    header: "To amount",
    meta: { headerLabel: "To amount" },
  },
  {
    accessorKey: "fee",
    header: "Fee",
    meta: { headerLabel: "Fee" },
    cell: ({ row }) => {
      const feeInUsd = row.original.feeInUsd;
      const fee = row.original.fee;
      if (feeInUsd != null && feeInUsd !== "") {
        return (
          <span className="tabular-nums text-muted-foreground text-sm">
            ${Number(feeInUsd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        );
      }
      return (
        <span className="tabular-nums text-muted-foreground text-sm">
          {fee != null && fee !== "" ? fee : "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "feeInUsd",
    header: "Fee (USD)",
    meta: { headerLabel: "Fee (USD)" },
    cell: ({ row }) => {
      const v = row.original.feeInUsd;
      if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums text-muted-foreground text-sm">
          ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      );
    },
  },
  {
    accessorKey: "fromToken",
    header: "From token",
    meta: { headerLabel: "From token" },
  },
  {
    accessorKey: "toToken",
    header: "To token",
    meta: { headerLabel: "To token" },
  },
  {
    accessorKey: "fromChain",
    header: "From chain",
    meta: { headerLabel: "From chain" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.fromChain || "—"}
      </span>
    ),
  },
  {
    accessorKey: "toChain",
    header: "To chain",
    meta: { headerLabel: "To chain" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.toChain || "—"}
      </span>
    ),
  },
  {
    accessorKey: "exchangeRate",
    header: "Exchange rate",
    meta: { headerLabel: "Exchange rate" },
    cell: ({ row }) => {
      const v = row.original.exchangeRate;
      return (
        <span className="tabular-nums text-muted-foreground text-sm">
          {v != null && v !== "" ? v : "—"}
        </span>
      );
    },
  },
  {
    accessorKey: "fTokenPriceUsd",
    header: "From price (USD)",
    meta: { headerLabel: "From price (USD)" },
    cell: ({ row }) => {
      const v = row.original.fTokenPriceUsd;
      if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums text-muted-foreground text-sm">
          ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      );
    },
  },
  {
    accessorKey: "tTokenPriceUsd",
    header: "To price (USD)",
    meta: { headerLabel: "To price (USD)" },
    cell: ({ row }) => {
      const v = row.original.tTokenPriceUsd;
      if (v == null || v === "") return <span className="text-muted-foreground">—</span>;
      return (
        <span className="tabular-nums text-muted-foreground text-sm">
          ${Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
        </span>
      );
    },
  },
  {
    accessorKey: "fromIdentifier",
    header: "From identifier",
    meta: { headerLabel: "From identifier" },
    cell: ({ row }) => {
      const val = row.original.fromIdentifier || "";
      return (
        <div className="flex items-center gap-2">
          <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground" title={val || undefined}>
            {val || "—"}
          </span>
          <CopyButton value={val} label="Copy from identifier" hideWhenEmpty />
        </div>
      );
    },
  },
  {
    accessorKey: "toIdentifier",
    header: "To identifier",
    meta: { headerLabel: "To identifier" },
    cell: ({ row }) => {
      const val = row.original.toIdentifier || "";
      return (
        <div className="flex items-center gap-2">
          <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground" title={val || undefined}>
            {val || "—"}
          </span>
          <CopyButton value={val} label="Copy to identifier" hideWhenEmpty />
        </div>
      );
    },
  },
  {
    accessorKey: "fromType",
    header: "From type",
    meta: { headerLabel: "From type" },
  },
  {
    accessorKey: "toType",
    header: "To type",
    meta: { headerLabel: "To type" },
  },
  {
    accessorKey: "fromUserId",
    header: "From user ID",
    meta: { headerLabel: "From user ID" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.fromUserId ? `${row.original.fromUserId.slice(0, 8)}…` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "toUserId",
    header: "To user ID",
    meta: { headerLabel: "To user ID" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.toUserId ? `${row.original.toUserId.slice(0, 8)}…` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "fromProvider",
    header: "From provider",
    meta: { headerLabel: "From provider" },
  },
  {
    accessorKey: "toProvider",
    header: "To provider",
    meta: { headerLabel: "To provider" },
  },
  {
    accessorKey: "requestId",
    header: "Request ID",
    meta: { headerLabel: "Request ID" },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground">
        {row.original.requestId ? `${row.original.requestId.slice(0, 8)}…` : "—"}
      </span>
    ),
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    meta: { headerLabel: "Created" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.createdAt instanceof Date
          ? row.original.createdAt.toLocaleString()
          : String(row.original.createdAt)}
      </span>
    ),
  },
  {
    accessorKey: "updatedAt",
    header: "Updated",
    meta: { headerLabel: "Updated" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-xs">
        {row.original.updatedAt instanceof Date
          ? row.original.updatedAt.toLocaleString()
          : String(row.original.updatedAt)}
      </span>
    ),
  },
  {
    id: "actions",
    header: "",
    meta: { headerLabel: "Actions" },
    enableHiding: false,
    cell: ({ row }) => {
      const status = row.original.status;
      if (status !== TransactionStatus.FAILED) return null;
      return (
        <RetryButton transactionId={row.original.id} />
      );
    },
  },
];

const TRANSACTIONS_EXPORT_COLUMNS: ExportColumn[] = columns
  .filter(
    (c): c is ColumnDef<TransactionRow> & { accessorKey: string } =>
      "accessorKey" in c && typeof (c as { accessorKey: string }).accessorKey === "string"
  )
  .filter((c) => c.id !== "actions")
  .map((c) => ({
    id: c.accessorKey,
    label: (c.meta as { headerLabel?: string } | undefined)?.headerLabel ?? c.accessorKey,
  }));

function RetryButton({ transactionId }: { transactionId: string }) {
  const [pending, setPending] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await retryTransaction(transactionId);
        setPending(false);
      }}
      className="gap-2"
    >
      <RotateCcw className="size-4" aria-hidden />
      {pending ? "Retrying…" : "Retry"}
    </Button>
  );
}

function EmptyTransactionsState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">No transactions yet</p>
        <p className="text-xs text-slate-500">
          Transactions will appear here when orders are created or synced from
          Core.
        </p>
      </div>
    </div>
  );
}

function getColumnLabel(col: { id: string; columnDef: { meta?: { headerLabel?: string } } }): string {
  return col.columnDef.meta?.headerLabel ?? col.id;
}

function loadPersistedColumnVisibility(): VisibilityState {
  try {
    const raw = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, boolean> | null;
      if (parsed && typeof parsed === "object") {
        return { ...defaultColumnVisibility, ...parsed };
      }
    }
  } catch {
    // ignore
  }
  return defaultColumnVisibility;
}

export function TransactionsDataTable({
  initialData,
}: {
  initialData: TransactionRow[];
}) {
  const [data, setData] = React.useState<TransactionRow[]>(initialData);
  const [refreshing, setRefreshing] = React.useState(false);
  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  // Always start with defaults so server and client first paint match (avoids hydration mismatch)
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  // After mount, apply persisted column visibility from localStorage (client-only)
  React.useEffect(() => {
    setColumnVisibility(loadPersistedColumnVisibility());
  }, []);
  React.useEffect(() => {
    try {
      localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(columnVisibility));
    } catch {
      // ignore
    }
  }, [columnVisibility]);

  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: DEFAULT_PAGE_SIZE,
  });
  const [pageSizeInput, setPageSizeInput] = React.useState(String(DEFAULT_PAGE_SIZE));
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [fromChainFilter, setFromChainFilter] = React.useState<string>("all");
  const [toChainFilter, setToChainFilter] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");
  const [searchQuery, setSearchQuery] = React.useState<string>("");
  const [providerFilter, setProviderFilter] = React.useState<string>("all");
  const searchRefreshDoneForQuery = React.useRef<string | null>(null);

  const chainOptions = React.useMemo(() => {
    const from = new Set(data.map((r) => r.fromChain).filter(Boolean));
    const to = new Set(data.map((r) => r.toChain).filter(Boolean));
    return Array.from(new Set([...from, ...to])).sort();
  }, [data]);

  const providerOptions = React.useMemo(() => {
    const from = new Set(data.map((r) => r.fromProvider).filter(Boolean));
    const to = new Set(data.map((r) => r.toProvider).filter(Boolean));
    return Array.from(new Set([...from, ...to])).sort();
  }, [data]);

  const filteredData = React.useMemo(() => {
    let list = data;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.id && r.id.toLowerCase().includes(q)) ||
          (r.fromIdentifier && r.fromIdentifier.toLowerCase().includes(q)) ||
          (r.toIdentifier && r.toIdentifier.toLowerCase().includes(q)) ||
          (r.fromUserId && r.fromUserId.toLowerCase().includes(q)) ||
          (r.toUserId && r.toUserId.toLowerCase().includes(q))
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      list = list.filter((r) => r.type === typeFilter);
    }
    if (providerFilter !== "all") {
      list = list.filter(
        (r) => r.fromProvider === providerFilter || r.toProvider === providerFilter
      );
    }
    if (fromChainFilter !== "all") {
      list = list.filter((r) => r.fromChain === fromChainFilter);
    }
    if (toChainFilter !== "all") {
      list = list.filter((r) => r.toChain === toChainFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      list = list.filter((r) => r.createdAt.getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      list = list.filter((r) => r.createdAt.getTime() <= to);
    }
    return list;
  }, [
    data,
    searchQuery,
    statusFilter,
    typeFilter,
    providerFilter,
    fromChainFilter,
    toChainFilter,
    dateFrom,
    dateTo,
  ]);

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      pagination,
    },
  });

  const applyCustomPageSize = React.useCallback(() => {
    const n = parseInt(pageSizeInput.trim(), 10);
    if (!Number.isNaN(n) && n >= 1) {
      setPagination((prev) => ({ ...prev, pageSize: n }));
      setPageSizeInput(String(n));
    } else {
      setPageSizeInput(String(pagination.pageSize));
    }
  }, [pageSizeInput, pagination.pageSize]);

  const handlePresetPageSize = (value: string) => {
    if (value === "custom") return;
    const n = Number(value);
    setPagination((prev) => ({ ...prev, pageSize: n }));
    setPageSizeInput(String(n));
  };

  const [exportModalOpen, setExportModalOpen] = React.useState(false);

  const exportData = React.useMemo((): Record<string, unknown>[] => {
    return filteredData.map((row) => {
      const r: Record<string, unknown> = { ...row };
      if (row.createdAt instanceof Date) r.createdAt = row.createdAt.toISOString();
      if (row.updatedAt instanceof Date) r.updatedAt = row.updatedAt.toISOString();
      return r;
    });
  }, [filteredData]);

  const handleRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const next = await refreshTransactionsAction();
      setData(Array.isArray(next) ? next : []);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // When search yields no results, trigger one background refresh so newly added transactions can appear
  React.useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      searchRefreshDoneForQuery.current = null;
      return;
    }
    if (filteredData.length > 0) return;
    if (searchRefreshDoneForQuery.current === q) return;
    searchRefreshDoneForQuery.current = q;
    refreshTransactionsAction().then((next) => {
      setData(Array.isArray(next) ? next : []);
    });
  }, [searchQuery, filteredData.length]);

  if (data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
          >
            {refreshing ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : null}
            Refresh
          </Button>
        </div>
        <EmptyTransactionsState />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          type="search"
          placeholder="Search by ID, identifier (to/from), or user ID…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md border border-slate-200 bg-white"
          aria-label="Search transactions"
        />
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value={TransactionStatus.COMPLETED}>Completed</SelectItem>
            <SelectItem value={TransactionStatus.FAILED}>Failed</SelectItem>
            <SelectItem value={TransactionStatus.PENDING}>Pending</SelectItem>
            <SelectItem value={TransactionStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={TransactionStatus.CANCELLED}>Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value={TransactionType.BUY}>Buy</SelectItem>
            <SelectItem value={TransactionType.SELL}>Sell</SelectItem>
            <SelectItem value={TransactionType.TRANSFER}>Transfer</SelectItem>
            <SelectItem value={TransactionType.REQUEST}>Request</SelectItem>
            <SelectItem value={TransactionType.CLAIM}>Claim</SelectItem>
          </SelectContent>
        </Select>
        {providerOptions.length > 0 && (
          <Select value={providerFilter} onValueChange={setProviderFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All providers</SelectItem>
              {providerOptions.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {chainOptions.length > 0 && (
          <>
            <Select value={fromChainFilter} onValueChange={setFromChainFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="From chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All from chains</SelectItem>
                {chainOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={toChainFilter} onValueChange={setToChainFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="To chain" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All to chains</SelectItem>
                {chainOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
        <div className="flex items-center gap-2">
          <Input
            type="date"
            placeholder="From"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-[140px]"
          />
          <Input
            type="date"
            placeholder="To"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-[140px]"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportModalOpen(true)}
            className="gap-2"
            aria-label="Export transactions"
          >
            <FileDown className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="gap-2"
            aria-label="Refresh transactions"
          >
            <Loader2
              className={`size-4 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden
            />
            Refresh
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                Columns <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[300px] overflow-y-auto">
              {table
                .getAllColumns()
                .filter((col) => col.getCanHide())
                .map((col) => (
                  <DropdownMenuCheckboxItem
                    key={col.id}
                    checked={col.getIsVisible()}
                    onCheckedChange={(v) => col.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {getColumnLabel(col)}
                  </DropdownMenuCheckboxItem>
                ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="rounded-md bg-white">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-sm text-black">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Rows per page</span>
          <Select
            value={
              PAGE_SIZE_PRESETS.includes(pagination.pageSize as (typeof PAGE_SIZE_PRESETS)[number])
                ? String(pagination.pageSize)
                : "custom"
            }
            onValueChange={handlePresetPageSize}
          >
            <SelectTrigger className="w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_PRESETS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">or</span>
          <Input
            type="number"
            min={1}
            placeholder="Any"
            value={pageSizeInput}
            onChange={(e) => setPageSizeInput(e.target.value)}
            onBlur={applyCustomPageSize}
            onKeyDown={(e) => {
              if (e.key === "Enter") applyCustomPageSize();
            }}
            className="w-[72px] tabular-nums"
            aria-label="Custom rows per page"
          />
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      </div>

      <ExportDataModal
        open={exportModalOpen}
        onOpenChange={setExportModalOpen}
        title="Export transactions"
        columns={TRANSACTIONS_EXPORT_COLUMNS}
        data={exportData}
        filenamePrefix="transactions"
        includeChartsOption
      />
    </div>
  );
}

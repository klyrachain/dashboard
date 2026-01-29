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
import { ChevronDown, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { retryTransaction } from "@/app/transactions/actions";
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

/** Default visible columns: ID, Type, Status, amounts/tokens, providers, Created, Actions. */
const defaultColumnVisibility: VisibilityState = {
  fromPrice: false,
  toPrice: false,
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
    cell: ({ row }) => (
      <span className="font-mono text-muted-foreground">
        {row.getValue("id")?.toString().slice(0, 8)}…
      </span>
    ),
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
    accessorKey: "fromPrice",
    header: "From price",
    meta: { headerLabel: "From price" },
  },
  {
    accessorKey: "toPrice",
    header: "To price",
    meta: { headerLabel: "To price" },
  },
  {
    accessorKey: "fromIdentifier",
    header: "From identifier",
    meta: { headerLabel: "From identifier" },
    cell: ({ row }) => (
      <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground" title={row.original.fromIdentifier}>
        {row.original.fromIdentifier || "—"}
      </span>
    ),
  },
  {
    accessorKey: "toIdentifier",
    header: "To identifier",
    meta: { headerLabel: "To identifier" },
    cell: ({ row }) => (
      <span className="max-w-[120px] truncate font-mono text-xs text-muted-foreground" title={row.original.toIdentifier}>
        {row.original.toIdentifier || "—"}
      </span>
    ),
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

export function TransactionsDataTable({
  initialData,
}: {
  initialData: TransactionRow[];
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [dateFrom, setDateFrom] = React.useState<string>("");
  const [dateTo, setDateTo] = React.useState<string>("");

  const filteredData = React.useMemo(() => {
    let data = initialData;
    if (statusFilter !== "all") {
      data = data.filter((r) => r.status === statusFilter);
    }
    if (typeFilter !== "all") {
      data = data.filter((r) => r.type === typeFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom).getTime();
      data = data.filter((r) => r.createdAt.getTime() >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + "T23:59:59").getTime();
      data = data.filter((r) => r.createdAt.getTime() <= to);
    }
    return data;
  }, [initialData, statusFilter, typeFilter, dateFrom, dateTo]);

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
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (initialData.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyTransactionsState />
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto gap-2">
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
                >
                  {getColumnLabel(col)}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
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

      <div className="flex items-center justify-end gap-4">
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
  );
}

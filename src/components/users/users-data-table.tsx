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
import { ChevronDown, Download, BarChart3, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CopyButton } from "@/components/ui/copy-button";
import type { UserWithTransactions } from "@/lib/data-users";
import { filterTransactionsForUser, type TransactionRow } from "@/lib/data-transactions";
import { format } from "date-fns";

function effectiveTransactionCount(user: UserWithTransactions, allTransactions: TransactionRow[]) {
  if (allTransactions.length > 0) {
    return filterTransactionsForUser(allTransactions, {
      id: user.id,
      email: user.email,
      address: user.address,
    }).length;
  }
  return user.transactions.length;
}

const defaultColumnVisibility: VisibilityState = {
  address: true,
};

const baseColumns: ColumnDef<UserWithTransactions>[] = [
  {
    accessorKey: "id",
    header: "ID",
    meta: { headerLabel: "ID" },
    cell: ({ row }) => {
      const id = row.original.id ?? "";
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-muted-foreground text-xs">
            {id.slice(0, 8)}…
          </span>
          <CopyButton value={id} label="Copy user ID" />
        </div>
      );
    },
  },
  {
    accessorKey: "email",
    header: "Email",
    meta: { headerLabel: "Email" },
    cell: ({ row }) => {
      const email = row.original.email ?? "";
      return (
        <div className="flex items-center gap-2">
          <span className="truncate max-w-[200px] block" title={email || undefined}>
            {email || "—"}
          </span>
          <CopyButton value={email} label="Copy email" hideWhenEmpty />
        </div>
      );
    },
  },
  {
    id: "customerSource",
    header: "Account",
    meta: { headerLabel: "Account" },
    accessorFn: (row) =>
      row.customerSource === "peer_ramp" ? "Peer Ramp" : "Morapay",
    cell: ({ row }) => (
      <span className="text-xs text-muted-foreground">
        {row.original.customerSource === "peer_ramp" ? "Peer Ramp" : "Morapay"}
      </span>
    ),
  },
  {
    accessorKey: "address",
    header: "Address",
    meta: { headerLabel: "Address" },
    cell: ({ row }) => {
      const address = row.original.address ?? "";
      return (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px] block" title={address || undefined}>
            {address || "—"}
          </span>
          <CopyButton value={address} label="Copy address" hideWhenEmpty />
        </div>
      );
    },
  },
  {
    accessorKey: "createdAt",
    header: "Created",
    meta: { headerLabel: "Created" },
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.createdAt instanceof Date
          ? format(row.original.createdAt, "MMM d, yyyy HH:mm")
          : String(row.original.createdAt)}
      </span>
    ),
  },
];

function makeTransactionColumn(allTransactions: TransactionRow[]): ColumnDef<UserWithTransactions> {
  return {
    id: "transactionCount",
    header: "Transactions",
    meta: { headerLabel: "Transactions" },
    accessorFn: (row) => effectiveTransactionCount(row, allTransactions),
    cell: ({ row }) => (
      <span className="text-muted-foreground tabular-nums">
        {effectiveTransactionCount(row.original, allTransactions)}
      </span>
    ),
  };
}

function getColumnLabel(col: { id: string; columnDef: { meta?: { headerLabel?: string } } }): string {
  return col.columnDef.meta?.headerLabel ?? col.id;
}

function exportToCsv(
  rows: UserWithTransactions[],
  visibleColumns: string[],
  allTransactions: TransactionRow[]
) {
  const headers = visibleColumns.map((id) => {
    if (id === "transactionCount") return "Transactions";
    if (id === "customerSource") return "Account";
    return id.charAt(0).toUpperCase() + id.slice(1);
  });
  const csvRows = rows.map((row) =>
    visibleColumns.map((colId) => {
      if (colId === "id") return row.id;
      if (colId === "email") return (row.email ?? "").replace(/"/g, '""');
      if (colId === "address") return (row.address ?? "").replace(/"/g, '""');
      if (colId === "createdAt")
        return row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt);
      if (colId === "transactionCount")
        return String(effectiveTransactionCount(row, allTransactions));
      if (colId === "customerSource")
        return row.customerSource === "peer_ramp" ? "Peer Ramp" : "Morapay";
      return "";
    }).map((c) => `"${c}"`).join(",")
  );
  const csv = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `users-export-${format(new Date(), "yyyy-MM-dd-HHmm")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function EmptyUsersState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-slate-200 bg-slate-50/50 py-16 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">No customers yet</p>
        <p className="text-xs text-slate-500">
          Customers will appear here when they sign up or when data is synced from our payment gateway.
        </p>
      </div>
    </div>
  );
}

export type UsersDataTableProps = {
  initialData: UserWithTransactions[];
  /** When provided, transaction counts match the platform transaction list (GET /api/transactions). */
  allTransactions?: TransactionRow[];
  selectedUserId: string | null;
  onSelectUser: (user: UserWithTransactions | null) => void;
  onAnalyze?: (user: UserWithTransactions) => void;
};

export function UsersDataTable({
  initialData,
  allTransactions = [],
  selectedUserId,
  onSelectUser,
  onAnalyze,
}: UsersDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(defaultColumnVisibility);
  const [globalFilter, setGlobalFilter] = React.useState("");

  const columns = React.useMemo(
    () => [...baseColumns, makeTransactionColumn(allTransactions)],
    [allTransactions]
  );

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table returns unstable function refs; safe here
  const table = useReactTable({
    data: initialData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const v = String(filterValue).toLowerCase().trim();
      if (!v) return true;
      const id = String(row.original.id).toLowerCase();
      const email = (row.original.email ?? "").toLowerCase();
      const address = (row.original.address ?? "").toLowerCase();
      const account =
        row.original.customerSource === "peer_ramp" ? "peer ramp morapay" : "morapay portal";
      return (
        id.includes(v) ||
        email.includes(v) ||
        address.includes(v) ||
        account.includes(v)
      );
    },
    initialState: { pagination: { pageSize: 10 } },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  const visibleColumnIds = table.getVisibleLeafColumns().map((c) => c.id);
  const handleExport = () => {
    const rows = table.getFilteredRowModel().rows.map((r) => r.original);
    exportToCsv(rows, visibleColumnIds, allTransactions);
  };

  const selectedUser = selectedUserId
    ? initialData.find((u) => u.id === selectedUserId) ?? null
    : null;

  if (initialData.length === 0) {
    return (
      <div className="space-y-4">
        <EmptyUsersState />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap justify-between items-center gap-4 w-full">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email, address, or ID…"
            value={globalFilter ?? ""}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="border border-slate-200 bg-white pl-9 shadow-sm placeholder:text-slate-400 focus-visible:border-slate-300 focus-visible:ring-2 focus-visible:ring-slate-200"
            aria-label="Filter customers"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
            <Download className="size-4" aria-hidden />
            Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!selectedUser}
            onClick={() => selectedUser && onAnalyze?.(selectedUser)}
            className="gap-2"
          >
            <BarChart3 className="size-4" aria-hidden />
            Analyze
          </Button>
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
      </div>

      <div className="rounded-md border border-slate-200 bg-white">
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
              table.getRowModel().rows.map((row) => {
                const isSelected = row.original.id === selectedUserId;
                return (
                  <TableRow
                    key={row.id}
                    className={
                      isSelected
                        ? "bg-primary/5 border-primary/20"
                        : "cursor-pointer hover:bg-muted/50"
                    }
                    onClick={() => onSelectUser(isSelected ? null : row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end gap-4">
        <p className="text-sm text-muted-foreground">
          Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
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

"use client";

import { useMemo, useState } from "react";
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
import { Card } from "@/components/ui/card";
import {
  formatCurrency,
  formatDate,
  type BalanceActivity,
} from "@/lib/data-balances";

const TYPE_FILTER_ALL = "all";

type TypeFilter = typeof TYPE_FILTER_ALL | string;

interface RecentActivityTableProps {
  activities: BalanceActivity[];
}

function EmptyActivityState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-slate-100">
        <span className="text-2xl text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-slate-600">No activity yet</p>
        <p className="text-xs text-slate-500">
          Recent fees and payouts will appear here.
        </p>
      </div>
    </div>
  );
}

export function RecentActivityTable({ activities }: RecentActivityTableProps) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(TYPE_FILTER_ALL);

  const types = useMemo(() => {
    const set = new Set(activities.map((a) => a.type));
    return Array.from(set).sort();
  }, [activities]);

  const filtered = useMemo(() => {
    if (typeFilter === TYPE_FILTER_ALL) return activities;
    return activities.filter((a) => a.type === typeFilter);
  }, [activities, typeFilter]);

  const hasData = filtered.length > 0;

  return (
    <section>
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-sm font-medium text-slate-500">Recent activity</h2>
        <Select
          value={typeFilter}
          onValueChange={(v) => setTypeFilter(v as TypeFilter)}
        >
          <SelectTrigger className="w-full sm:w-[160px]" aria-label="Filter by type">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TYPE_FILTER_ALL}>All types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="mb-4 text-xs text-slate-500">Data from poll</p>
      <Card className="bg-white">
        {hasData ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-slate-600">Fees</TableHead>
                <TableHead className="text-slate-600">Total</TableHead>
                <TableHead className="text-slate-600">Type</TableHead>
                <TableHead className="text-slate-600">Description</TableHead>
                <TableHead className="text-slate-600">Created</TableHead>
                <TableHead className="text-slate-600">Available on</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-mono font-medium text-slate-900">
                    {formatCurrency(row.fees)}
                  </TableCell>
                  <TableCell className="font-mono text-slate-700">
                    {formatCurrency(row.total)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {row.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {row.description}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(row.created)}
                  </TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {formatDate(row.availableOn)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyActivityState />
        )}
      </Card>
    </section>
  );
}

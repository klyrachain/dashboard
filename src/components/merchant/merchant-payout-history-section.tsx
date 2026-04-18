"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetMerchantSettlementByIdQuery } from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import type { MerchantListMeta } from "@/types/merchant-api";
import {
  destinationFromRow,
  formatMoneyAmount,
  getSettlementStatusLabel,
  parseAmountString,
  pickString,
} from "./merchant-payout-utils";

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "PROCESSING", label: "Processing" },
  { value: "PAID", label: "Paid" },
  { value: "FAILED", label: "Failed" },
  { value: "REVERSED", label: "Reversed" },
];

function statusBadgeVariant(
  status: string
): "success" | "warning" | "destructive" | "secondary" | "outline" {
  const u = status.toUpperCase();
  if (u === "PAID") return "success";
  if (u === "FAILED" || u === "REVERSED") return "destructive";
  if (u === "PROCESSING") return "warning";
  if (u === "SCHEDULED") return "secondary";
  return "outline";
}

type MerchantPayoutHistorySectionProps = {
  items: Record<string, unknown>[];
  meta: MerchantListMeta;
  page: number;
  statusFilter: string;
  isLoading: boolean;
  onStatusChange: (value: string) => void;
  onPageChange: (nextPage: number) => void;
};

export function MerchantPayoutHistorySection({
  items,
  meta,
  page,
  statusFilter,
  isLoading,
  onStatusChange,
  onPageChange,
}: MerchantPayoutHistorySectionProps) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const { skipMerchantApi } = useMerchantTenantScope();

  const { data: detailRaw, isFetching: detailLoading } =
    useGetMerchantSettlementByIdQuery(detailId ?? "", {
      skip: skipMerchantApi || !detailId,
    });

  const detail =
    detailRaw && typeof detailRaw === "object"
      ? (detailRaw as Record<string, unknown>)
      : null;

  const failureMessage = detail
    ? pickString(
        detail,
        [
          "failureReason",
          "failureMessage",
          "providerError",
          "errorMessage",
          "lastError",
          "rejectionReason",
        ],
        ""
      )
    : "";

  return (
    <section aria-labelledby="recent-payouts-heading" className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h2
            id="recent-payouts-heading"
            className="text-sm font-medium text-muted-foreground"
          >
            Recent Payouts
          </h2>
          <p className="text-sm text-muted-foreground max-w-prose">
            A complete record of your past withdrawals.
          </p>
        </div>
        <Select
          value={statusFilter}
          onValueChange={onStatusChange}
        >
          <SelectTrigger
            className="w-full sm:w-[180px] sm:shrink-0"
            aria-label="Filter payouts by status"
          >
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden bg-card shadow-none">
        {isLoading ? (
          <div className="px-6 py-6 space-y-3" role="status" aria-live="polite">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : items.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            No payouts match this filter.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Date & time</TableHead>
                <TableHead scope="col">Amount</TableHead>
                <TableHead scope="col">Destination</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col">Reference</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((raw) => {
                const row = raw as Record<string, unknown>;
                const id = pickString(row, ["id", "_id"]);
                const amount = pickString(row, [
                  "netAmount",
                  "amount",
                  "gross",
                  "grossAmount",
                ]);
                const currency = pickString(row, ["currency", "payoutCurrency"], "USD");
                const st = pickString(row, ["status"], "—");
                const created = pickString(row, ["createdAt", "scheduledAt"], "");
                let dateLabel = created;
                try {
                  if (created && created !== "—") {
                    dateLabel = format(parseISO(created), "MMM d, yyyy, HH:mm");
                  }
                } catch {
                  /* keep raw */
                }
                const dest = destinationFromRow(row);
                const ref = pickString(row, ["reference", "externalRef"], "—");
                const rowFailHint = pickString(
                  row,
                  ["failureReason", "errorMessage", "providerError"],
                  ""
                );

                return (
                  <TableRow
                    key={id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setDetailId(id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setDetailId(id);
                      }
                    }}
                    tabIndex={0}
                    aria-label={`View payout ${id}, ${getSettlementStatusLabel(st)}`}
                  >
                    <TableCell className="whitespace-nowrap text-sm">
                      {dateLabel}
                    </TableCell>
                    <TableCell className="font-medium tabular-nums">
                      {formatMoneyAmount(parseAmountString(amount), currency)}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">
                      {dest}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={statusBadgeVariant(st)}
                        title={
                          st.toUpperCase() === "FAILED" && rowFailHint
                            ? rowFailHint
                            : getSettlementStatusLabel(st)
                        }
                      >
                        {getSettlementStatusLabel(st)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs max-w-[140px] truncate">
                      {ref}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      {meta.total > meta.limit ? (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <span className="text-muted-foreground tabular-nums">
            Page {meta.page}, {meta.total} total
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={page * meta.limit >= meta.total}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}

      <Dialog open={detailId != null} onOpenChange={(o) => !o && setDetailId(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto" showClose>
          <DialogHeader>
            <DialogTitle>Payout details</DialogTitle>
            <DialogDescription>
              Reference this information when you contact support.
            </DialogDescription>
          </DialogHeader>
          {detailLoading && (
            <div className="space-y-2 py-4" role="status">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {!detailLoading && detail && (
            <div className="space-y-4 text-sm">
              <dl className="grid gap-2">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">ID</dt>
                  <dd className="font-mono text-xs break-all text-right">
                    {pickString(detail, ["id", "_id"])}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Status</dt>
                  <dd>
                    <Badge variant={statusBadgeVariant(pickString(detail, ["status"]))}>
                      {getSettlementStatusLabel(pickString(detail, ["status"]))}
                    </Badge>
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Net</dt>
                  <dd className="tabular-nums font-medium">
                    {pickString(detail, ["netAmount", "amount", "net"])}{" "}
                    {pickString(detail, ["currency"], "")}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted-foreground">Reference</dt>
                  <dd className="font-mono text-xs">
                    {pickString(detail, ["reference", "externalRef"])}
                  </dd>
                </div>
              </dl>
              {pickString(detail, ["status"]).toUpperCase() === "FAILED" ? (
                <div
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-4"
                  role="alert"
                >
                  <p className="text-xs font-semibold uppercase text-destructive">
                    Why this failed
                  </p>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs text-foreground">
                    {failureMessage || "No detailed error was returned. Contact support with the payout ID above."}
                  </pre>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

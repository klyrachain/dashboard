"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import type {
  FailedValidationRow,
  FailedValidationReport,
  ValidationFailedListResult,
} from "@/lib/data-validation";

type UnfulfilledTransactionsViewProps = {
  result: ValidationFailedListResult;
  report: FailedValidationReport | null;
  currentPage: number;
  currentLimit: number;
};

const LIMIT_OPTIONS = [15, 20, 50, 100] as const;

function buildQuery(page: number, limit: number): string {
  const params = new URLSearchParams();
  params.set("view", "unfulfilled");
  if (page > 1) params.set("page", String(page));
  if (limit !== 20) params.set("limit", String(limit));
  return `?${params.toString()}`;
}

function payloadSummary(payload: FailedValidationRow["payload"]): string {
  if (!payload || typeof payload !== "object") return "—";
  const parts: string[] = [];
  if (payload.f_chain) parts.push(`from ${payload.f_chain}`);
  if (payload.t_chain) parts.push(`to ${payload.t_chain}`);
  if (payload.f_token) parts.push(payload.f_token);
  if (payload.t_token) parts.push("→", payload.t_token);
  if (payload.f_amount != null) parts.push(String(payload.f_amount));
  return parts.length ? parts.join(" ") : "—";
}

export function UnfulfilledTransactionsView({
  result,
  report,
  currentPage,
  currentLimit,
}: UnfulfilledTransactionsViewProps) {
  const router = useRouter();
  const { items, meta } = result;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const prevQuery = buildQuery(currentPage - 1, currentLimit);
  const nextQuery = buildQuery(currentPage + 1, currentLimit);

  const handleLimitChange = (value: string) => {
    router.push(`/transactions${buildQuery(1, Number(value))}`);
  };

  return (
    <div className="space-y-6 font-primary text-body">
      <p className="font-secondary text-caption text-muted-foreground max-w-prose">
        Validation inbox: orders that hit your pipeline but did not pass automated checks. This is{" "}
        <strong className="font-medium text-foreground">not</strong> a filter on the main transaction list.
      </p>

      {report && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total (all time)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{report.total}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 24h
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{report.last24h}</p>
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Last 7 days
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{report.last7d}</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.refresh()}
          className="gap-2"
          aria-label="Refresh unfulfilled list"
        >
          Refresh
        </Button>
      </div>

      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Failed validations</CardTitle>
          <p className="text-sm text-muted-foreground">Recent failures (paginated).</p>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <p className="text-sm font-medium text-slate-600">No failed validations</p>
              <p className="text-xs text-slate-500">
                Rejected orders will appear here when validation fails.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">Date</TableHead>
                      <TableHead className="w-[120px]">Code</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="max-w-[200px]">Payload</TableHead>
                      <TableHead className="w-[100px]">Request ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                          {row.createdAt
                            ? format(new Date(row.createdAt), "yyyy-MM-dd HH:mm")
                            : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.code || "—"}
                        </TableCell>
                        <TableCell className="text-sm max-w-[240px] truncate" title={row.reason}>
                          {row.reason || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate" title={payloadSummary(row.payload)}>
                          {payloadSummary(row.payload)}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {row.requestId
                            ? `${row.requestId.slice(0, 8)}…`
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Rows per page</span>
                  <Select
                    value={String(currentLimit)}
                    onValueChange={handleLimitChange}
                  >
                    <SelectTrigger className="w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LIMIT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    Page {meta.page} of {totalPages} · {meta.total} total
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={currentPage <= 1}
                  >
                    <Link href={`/transactions${prevQuery}`}>Previous</Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    disabled={currentPage >= totalPages}
                  >
                    <Link href={`/transactions${nextQuery}`}>Next</Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

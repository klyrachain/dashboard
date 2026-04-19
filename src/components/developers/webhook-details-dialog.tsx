"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  EyeOff,
  Shield,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { WebhookDeliveryVolumeChart, WebhookResponseTimesChart } from "@/components/developers/webhook-details-charts";
import { MERCHANT_WEBHOOK_EVENT_OPTIONS } from "@/lib/merchant-webhook-events";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  useGetMerchantWebhookDeliveriesQuery,
  useGetMerchantWebhookEndpointSummaryQuery,
  usePostMerchantWebhookRevealSecretMutation,
} from "@/store/merchant-api";
import type { MerchantWebhookDeliveryRow, MerchantWebhookEndpointRow } from "@/types/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";

const DELIVERIES_PAGE_SIZE = 10;

type DatePreset = "30" | "60" | "90" | "custom";

function isoRangeFromDays(days: number): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to.getTime() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

function formatMerchantQueryError(error: unknown): string {
  if (!error || typeof error !== "object") return "Try again later.";
  const o = error as Record<string, unknown>;
  if (typeof o.message === "string") return o.message;
  const data = o.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.error === "string") return d.error;
  }
  if (typeof o.error === "string") return o.error;
  return "Try again later.";
}

function eventLabel(id: string): string {
  const hit = MERCHANT_WEBHOOK_EVENT_OPTIONS.find((o) => o.id === id);
  return hit?.label ?? id;
}

type WebhookDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  endpoint: MerchantWebhookEndpointRow | null;
  skipMerchantApi: boolean;
  onRequestEdit?: (row: MerchantWebhookEndpointRow) => void;
};

function WebhookOverviewMetricsSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading metrics">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-3 shadow-sm">
            <Skeleton className="mb-2 h-3 w-28" />
            <Skeleton className="h-8 w-20 max-w-full" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-[220px] w-full rounded-lg border border-border" />
        <Skeleton className="h-[220px] w-full rounded-lg border border-border" />
      </div>
    </div>
  );
}

function WebhookSigningSecretCard({
  endpoint,
  onRequestEdit,
}: {
  endpoint: MerchantWebhookEndpointRow;
  onRequestEdit: () => void;
}) {
  const [secretPlaintext, setSecretPlaintext] = React.useState<string | null>(null);
  const [secretVisible, setSecretVisible] = React.useState(false);
  const [revealError, setRevealError] = React.useState<string | null>(null);
  const [revealSecret, { isLoading: revealing }] = usePostMerchantWebhookRevealSecretMutation();
  const epId = endpoint.id;

  const handleRevealSecret = async () => {
    if (!endpoint.hasSecret) return;
    setRevealError(null);
    if (secretPlaintext != null) {
      setSecretVisible((v) => !v);
      return;
    }
    try {
      const res = await revealSecret(epId).unwrap();
      if (res?.secret) {
        setSecretPlaintext(res.secret);
        setSecretVisible(true);
      }
    } catch (err) {
      setRevealError(formatMerchantQueryError(err) || "Could not load signing secret.");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20 p-4">
      <div className="mb-2 flex items-center gap-2">
        <Shield className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold text-foreground">Signing secret</h3>
      </div>
      <p className="mb-3 font-secondary text-caption text-muted-foreground">
        Use this secret to verify incoming webhook signatures.
      </p>
      {!endpoint.hasSecret ? (
        <div className="space-y-2">
          <p className="text-caption text-muted-foreground">
            No signing secret on file yet. New destinations get a unique secret automatically; saving this destination
            in Edit destination will provision one if it is still missing.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onRequestEdit}>
            Edit destination
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            {revealing && secretPlaintext == null ? (
              <Skeleton className="h-9 min-w-0 flex-1 rounded-md" aria-hidden />
            ) : (
              <Input
                readOnly
                className="font-mono text-caption"
                value={
                  secretPlaintext == null
                    ? "••••••••••••••••••••"
                    : secretVisible
                      ? secretPlaintext
                      : "•".repeat(Math.min(24, secretPlaintext.length))
                }
                aria-label="Signing secret"
              />
            )}
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={revealing}
              aria-label={secretVisible ? "Hide secret" : "Reveal secret"}
              onClick={() => void handleRevealSecret()}
            >
              {secretVisible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-9 shrink-0"
              disabled={!secretPlaintext}
              aria-label="Copy signing secret"
              onClick={() => {
                if (secretPlaintext) void navigator.clipboard.writeText(secretPlaintext);
              }}
            >
              <Copy className="size-4" />
            </Button>
          </div>
          {revealError ? (
            <p className="mt-2 text-caption text-destructive" role="alert">
              {revealError}
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}

type WebhookDeliveriesTabProps = {
  epId: string;
  range: { from: string; to: string };
  skipMerchantApi: boolean;
  merchantApiScopeKey: string;
  preset: DatePreset;
  setPreset: (v: DatePreset) => void;
  customFrom: string;
  setCustomFrom: (v: string) => void;
  customTo: string;
  setCustomTo: (v: string) => void;
};

function WebhookDeliveriesTableSkeleton() {
  return (
    <div className="rounded-lg border border-border" aria-busy="true" aria-label="Loading deliveries">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-10" />
            <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Response</TableHead>
            <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Event type</TableHead>
            <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Latency</TableHead>
            <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <Skeleton className="size-8 rounded-md" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-6 w-14 rounded-full" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-40" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-12" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-28" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function WebhookDeliveriesTab({
  epId,
  range,
  skipMerchantApi,
  merchantApiScopeKey,
  preset,
  setPreset,
  customFrom,
  setCustomFrom,
  customTo,
  setCustomTo,
}: WebhookDeliveriesTabProps) {
  const [deliveriesPage, setDeliveriesPage] = React.useState(1);
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(() => new Set());

  const { data: deliveriesRes, isLoading: deliveriesLoading } = useGetMerchantWebhookDeliveriesQuery(
    {
      endpointId: epId,
      page: deliveriesPage,
      limit: DELIVERIES_PAGE_SIZE,
      from: range.from,
      to: range.to,
      merchantApiScopeKey,
    },
    { skip: skipMerchantApi || !epId }
  );

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const meta = deliveriesRes?.meta;
  const deliveries = deliveriesRes?.items ?? [];
  const total = meta?.total ?? 0;
  const page = meta?.page ?? deliveriesPage;
  const limit = meta?.limit ?? DELIVERIES_PAGE_SIZE;
  const fromIdx = total === 0 ? 0 : (page - 1) * limit + 1;
  const toIdx = Math.min(page * limit, total);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
        <span>Date</span>
        <Select value={preset} onValueChange={(v) => setPreset(v as DatePreset)}>
          <SelectTrigger className="h-9 w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="custom">Custom range</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {preset === "custom" ? (
        <div className="flex flex-wrap gap-3">
          <Input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-40" />
          <Input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-40" />
        </div>
      ) : null}

      {deliveriesLoading ? (
        <WebhookDeliveriesTableSkeleton />
      ) : (
        <>
          <div className="rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Response</TableHead>
                  <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Event type</TableHead>
                  <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Latency</TableHead>
                  <TableHead className="font-secondary text-caption uppercase text-muted-foreground">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((row) => (
                  <React.Fragment key={row.id}>
                    <DeliveryRow
                      row={row}
                      expanded={expandedRows.has(row.id)}
                      onToggle={() => toggleRow(row.id)}
                    />
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-caption text-muted-foreground">
              {total === 0 ? "0" : `${fromIdx}-${toIdx}`} of {total}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setDeliveriesPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page * limit >= total}
                onClick={() => setDeliveriesPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function WebhookDetailsDialog({
  open,
  onOpenChange,
  endpoint,
  skipMerchantApi,
  onRequestEdit,
}: WebhookDetailsDialogProps) {
  const { merchantApiScopeKey } = useMerchantTenantScope();
  const [tab, setTab] = React.useState<"overview" | "deliveries">("overview");
  const [preset, setPreset] = React.useState<DatePreset>("30");
  const [customFrom, setCustomFrom] = React.useState("");
  const [customTo, setCustomTo] = React.useState("");
  const [eventsOpen, setEventsOpen] = React.useState(false);

  const range = React.useMemo(() => {
    if (preset === "custom" && customFrom && customTo) {
      const from = new Date(`${customFrom}T00:00:00.000Z`);
      const to = new Date(`${customTo}T23:59:59.999Z`);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime()) && from <= to) {
        const spanDays = (to.getTime() - from.getTime()) / 86_400_000;
        if (spanDays <= 90) return { from: from.toISOString(), to: to.toISOString() };
      }
    }
    if (preset === "60") return isoRangeFromDays(60);
    if (preset === "90") return isoRangeFromDays(90);
    return isoRangeFromDays(30);
  }, [preset, customFrom, customTo]);

  const epId = endpoint?.id ?? "";

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryIsError,
    error: summaryError,
  } = useGetMerchantWebhookEndpointSummaryQuery(
    { id: epId, from: range.from, to: range.to },
    { skip: skipMerchantApi || !open || !epId }
  );

  const handleDialogOpenChange = (next: boolean) => {
    if (!next) {
      setTab("overview");
      setEventsOpen(false);
      setPreset("30");
      setCustomFrom("");
      setCustomTo("");
    }
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showClose
        className="flex h-[min(72.9dvh,713px)] max-h-[min(72.9dvh,713px)] w-full max-w-[79.2rem] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground sm:max-w-[79.2rem]"
      >
        <div className="shrink-0 px-6 pb-3 pt-4">
          <DialogHeader className="space-y-0 p-0 text-left">
            <div
              className={cn(
                "flex w-full min-w-0 items-center gap-2.5 rounded-full py-1.5 pl-2.5 pr-3 sm:pl-3",
                "bg-gradient-to-r from-sky-400/30 from-[0%] via-sky-500/[0.1] via-[26%] to-transparent to-[46%]",
                "dark:from-primary/25 dark:via-primary/[0.12] dark:via-[28%] dark:to-transparent dark:to-[48%]"
              )}
            >
              <div
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm sm:size-10"
                aria-hidden
              >
                <Zap className="size-4 sm:size-[18px]" />
              </div>
              <DialogTitle className="min-w-0 flex-1 text-base font-semibold tracking-tight text-primary sm:text-lg">
                Webhook details
              </DialogTitle>
            </div>
          </DialogHeader>

          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="tablist"
            aria-label="Webhook details sections"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "overview"}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === "overview"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              onClick={() => setTab("overview")}
            >
              Overview
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "deliveries"}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                tab === "deliveries"
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
              onClick={() => setTab("deliveries")}
            >
              Event deliveries
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {!endpoint ? null : tab === "overview" ? (
            <div className="grid gap-6 lg:grid-cols-10">
              <div className="space-y-4 lg:col-span-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <h2 className="text-sm font-semibold text-foreground">Performance</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-secondary text-caption text-muted-foreground">Date</span>
                    <Select
                      value={preset}
                      onValueChange={(v) => setPreset(v as DatePreset)}
                    >
                      <SelectTrigger className="h-9 w-[200px]">
                        <SelectValue placeholder="Range" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                        <SelectItem value="custom">Custom range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {preset === "custom" ? (
                  <div className="flex flex-wrap gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="wh-d-from" className="text-caption">
                        From
                      </Label>
                      <Input
                        id="wh-d-from"
                        type="date"
                        value={customFrom}
                        onChange={(e) => setCustomFrom(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="wh-d-to" className="text-caption">
                        To
                      </Label>
                      <Input
                        id="wh-d-to"
                        type="date"
                        value={customTo}
                        onChange={(e) => setCustomTo(e.target.value)}
                        className="w-40"
                      />
                    </div>
                  </div>
                ) : null}

                {summaryLoading ? (
                  <WebhookOverviewMetricsSkeleton />
                ) : (
                  <>
                    {summaryIsError ? (
                      <p className="text-caption text-destructive" role="alert">
                        Could not load metrics. {formatMerchantQueryError(summaryError)}
                      </p>
                    ) : summary ? (
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <KpiCard label="Total deliveries" value={String(summary.totalDeliveries)} />
                        <KpiCard
                          label="Error rate"
                          value={`${summary.errorRatePct}%`}
                          valueClassName={summary.errorRatePct > 0 ? "text-destructive" : undefined}
                        />
                        <KpiCard
                          label="Avg response time"
                          value={summary.avgLatencyMs == null ? "—" : `${summary.avgLatencyMs} ms`}
                        />
                        <KpiCard
                          label="Last delivery"
                          value={
                            summary.lastDeliveryAt
                              ? new Date(summary.lastDeliveryAt).toLocaleString()
                              : "—"
                          }
                        />
                      </div>
                    ) : (
                      <p className="text-caption text-muted-foreground">
                        No aggregate summary for this range yet. Charts below use a preview until data exists.
                      </p>
                    )}
                    {!summaryIsError ? (
                      <div className="grid gap-4 lg:grid-cols-2">
                        <WebhookDeliveryVolumeChart buckets={summary?.buckets ?? []} />
                        <WebhookResponseTimesChart latencyByDay={summary?.latencyByDay ?? null} />
                      </div>
                    ) : null}
                  </>
                )}
              </div>

              <div className="space-y-4 lg:col-span-3">
                <div className="rounded-lg border border-border bg-muted/20 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Zap className="size-4 text-primary" aria-hidden />
                    <h3 className="text-sm font-semibold text-foreground">Destination details</h3>
                  </div>
                  <dl className="space-y-3 font-secondary text-caption">
                    <div>
                      <dt className="text-muted-foreground">Status</dt>
                      <dd className="mt-1">
                        <Badge variant={endpoint.isActive ? "success" : "secondary"}>
                          {endpoint.isActive ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Destination ID</dt>
                      <dd className="mt-1 break-all font-mono text-[11px] leading-snug text-primary">{endpoint.id}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Name</dt>
                      <dd className="mt-1 font-medium text-foreground">{endpoint.displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Endpoint URL</dt>
                      <dd className="mt-1 break-all font-mono text-[11px] leading-snug text-foreground">{endpoint.url}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">API version</dt>
                      <dd className="mt-1 uppercase text-foreground">{endpoint.protocolVersion ?? "v1"}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Listening to</dt>
                      <dd className="mt-1">
                        <span className="text-foreground">
                          {(endpoint.events?.length ?? 0).toString()} events
                        </span>
                        <button
                          type="button"
                          className="ml-2 font-medium text-primary underline-offset-4 hover:underline"
                          aria-expanded={eventsOpen}
                          onClick={() => setEventsOpen((o) => !o)}
                        >
                          {eventsOpen ? "Hide" : "Show"}
                        </button>
                        {eventsOpen ? (
                          <ul className="mt-2 list-none space-y-1.5 pl-0">
                            {(endpoint.events ?? []).map((ev) => (
                              <li key={ev} className="break-all font-mono text-[11px] leading-snug text-foreground">
                                {ev}
                                <span className="ml-1.5 font-secondary text-caption text-muted-foreground">
                                  ({eventLabel(ev)})
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </dd>
                    </div>
                  </dl>
                </div>

                <WebhookSigningSecretCard
                  key={`${endpoint.id}-${endpoint.hasSecret}-${endpoint.updatedAt}`}
                  endpoint={endpoint}
                  onRequestEdit={() => {
                    handleDialogOpenChange(false);
                    onRequestEdit?.(endpoint);
                  }}
                />
              </div>
            </div>
          ) : (
            <WebhookDeliveriesTab
              key={`${epId}-${range.from}-${range.to}`}
              epId={epId}
              range={range}
              skipMerchantApi={skipMerchantApi}
              merchantApiScopeKey={merchantApiScopeKey}
              preset={preset}
              setPreset={setPreset}
              customFrom={customFrom}
              setCustomFrom={setCustomFrom}
              customTo={customTo}
              setCustomTo={setCustomTo}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-sm">
      <p className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-1 text-lg font-semibold tabular-nums text-foreground", valueClassName)}>{value}</p>
    </div>
  );
}

function DeliveryRow({
  row,
  expanded,
  onToggle,
}: {
  row: MerchantWebhookDeliveryRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const status = row.httpStatus;
  const isErr = status != null && (status < 200 || status >= 300);
  return (
    <>
      <TableRow className="align-middle">
        <TableCell>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={onToggle}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </TableCell>
        <TableCell>
          {status == null ? (
            <span className="text-caption text-muted-foreground">—</span>
          ) : (
            <Badge variant={isErr ? "destructive" : "secondary"} className="font-mono tabular-nums">
              {status}
            </Badge>
          )}
        </TableCell>
        <TableCell className="font-mono text-caption">{row.eventType}</TableCell>
        <TableCell className="text-caption text-muted-foreground">
          {row.durationMs != null ? `${row.durationMs} ms` : "—"}
        </TableCell>
        <TableCell className="text-caption text-muted-foreground">
          {new Date(row.createdAt).toLocaleString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </TableCell>
      </TableRow>
      {expanded ? (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30 p-4">
            <p className="mb-1 text-caption font-medium text-foreground">Payload</p>
            <pre className="max-h-48 overflow-auto rounded border border-border bg-background p-2 font-mono text-[11px] leading-relaxed">
              {safeJson(row.payload)}
            </pre>
            <p className="mb-1 mt-3 text-caption font-medium text-foreground">Response preview</p>
            <pre className="max-h-32 overflow-auto rounded border border-border bg-background p-2 font-mono text-[11px] leading-relaxed">
              {row.responseBodyPreview ?? "—"}
            </pre>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  );
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

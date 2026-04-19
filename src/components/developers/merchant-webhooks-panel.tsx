"use client";

import * as React from "react";
import {
  MoreHorizontal,
  PanelRight,
  Pencil,
  Trash2,
  Zap,
  ZapOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { WebhookDestinationDialog } from "@/components/developers/webhook-destination-dialog";
import { WebhookDetailsDialog } from "@/components/developers/webhook-details-dialog";
import { buildWebhookEndpointCharts } from "@/components/developers/webhook-delivery-metrics";
import { WebhookMiniSparkline } from "@/components/developers/webhook-mini-sparkline";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import {
  useDeleteMerchantWebhookEndpointMutation,
  useGetMerchantWebhookDeliveriesQuery,
  useGetMerchantWebhookEndpointsQuery,
  usePatchMerchantWebhookEndpointMutation,
} from "@/store/merchant-api";
import type { MerchantWebhookEndpointRow } from "@/types/merchant-api";
import { cn } from "@/lib/utils";

export function MerchantWebhooksPanel() {
  const { effectiveBusinessId, skipMerchantApi, merchantApiScopeKey } = useMerchantTenantScope();
  const { data: endpoints, isLoading, isError } = useGetMerchantWebhookEndpointsQuery(
    { merchantApiScopeKey },
    {
      skip: skipMerchantApi,
    }
  );
  const { data: deliveriesResult } = useGetMerchantWebhookDeliveriesQuery(
    { page: 1, limit: 400, merchantApiScopeKey },
    { skip: skipMerchantApi }
  );
  const deliveries = deliveriesResult?.items ?? [];

  const [formOpen, setFormOpen] = React.useState(false);
  const [formMode, setFormMode] = React.useState<"create" | "edit">("create");
  const [editInitial, setEditInitial] = React.useState<MerchantWebhookEndpointRow | null>(null);
  const [pendingDelete, setPendingDelete] = React.useState<MerchantWebhookEndpointRow | null>(null);
  const [detailsEndpoint, setDetailsEndpoint] = React.useState<MerchantWebhookEndpointRow | null>(null);
  const [webhookFormKey, setWebhookFormKey] = React.useState(0);

  const [patchEndpoint, { isLoading: patching }] = usePatchMerchantWebhookEndpointMutation();
  const [deleteEndpoint, { isLoading: deleting }] = useDeleteMerchantWebhookEndpointMutation();

  const resolveEndpointRow = React.useCallback(
    (row: MerchantWebhookEndpointRow) => endpoints?.find((e) => e.id === row.id) ?? row,
    [endpoints]
  );

  const resolvedDetailsEndpoint = React.useMemo(() => {
    if (!detailsEndpoint) return null;
    return resolveEndpointRow(detailsEndpoint);
  }, [detailsEndpoint, resolveEndpointRow]);

  const openCreate = () => {
    setWebhookFormKey((k) => k + 1);
    setFormMode("create");
    setEditInitial(null);
    setFormOpen(true);
  };

  const openEdit = (row: MerchantWebhookEndpointRow) => {
    setWebhookFormKey((k) => k + 1);
    setFormMode("edit");
    setEditInitial(resolveEndpointRow(row));
    setFormOpen(true);
  };

  const handleRequestEditFromDetails = (row: MerchantWebhookEndpointRow) => {
    openEdit(row);
  };

  const toggleActive = async (row: MerchantWebhookEndpointRow) => {
    try {
      await patchEndpoint({
        id: row.id,
        patch: { isActive: !row.isActive },
      }).unwrap();
    } catch {
      /* toast optional */
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteEndpoint(pendingDelete.id).unwrap();
      setPendingDelete(null);
    } catch {
      /* noop */
    }
  };

  const openRowDetails = (row: MerchantWebhookEndpointRow) => {
    setDetailsEndpoint(resolveEndpointRow(row));
  };

  if (!effectiveBusinessId) {
    return (
      <p className="font-secondary text-caption text-muted-foreground" role="status">
        Select a business to manage webhooks.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4" aria-labelledby="wh-dest-heading">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            <h2 id="wh-dest-heading" className="text-heading font-semibold text-foreground">
              Webhook destinations
            </h2>
            <p className="font-secondary text-caption text-muted-foreground">
              Manage destinations, events, and monitor delivery performance.
            </p>
          </div>
          <Button type="button" className="shrink-0 gap-2 self-start" onClick={openCreate}>
            + Add destination
          </Button>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-border bg-card shadow-sm" aria-busy="true" aria-label="Loading webhooks">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="min-w-48 font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Destination
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Version
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Listening
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Activity
                  </TableHead>
                  <TableHead className="hidden lg:table-cell font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Response
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Error rate
                  </TableHead>
                  <TableHead className="w-12 text-right font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-center">
                      <Skeleton className="mx-auto size-8 rounded-full" />
                    </TableCell>
                    <TableCell className="space-y-2">
                      <Skeleton className="h-4 w-36" />
                      <Skeleton className="h-3 w-full max-w-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-14" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <Skeleton className="h-8 w-20 rounded-md" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-8" />
                    </TableCell>
                    <TableCell className="text-right">
                      <Skeleton className="ml-auto size-8 rounded-md" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : isError ? (
          <p className="text-caption text-destructive" role="alert">
            Could not load webhooks.
          </p>
        ) : !endpoints?.length ? (
          <p className="font-secondary text-caption text-muted-foreground">
            No destinations yet.{" "}
            <button type="button" className="font-medium text-primary underline-offset-4 hover:underline" onClick={openCreate}>
              Add your first destination
            </button>
            .
          </p>
        ) : (
          <div className="rounded-lg border border-border bg-card shadow-sm">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="min-w-48 font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Destination
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Version
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Listening
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Activity
                  </TableHead>
                  <TableHead className="hidden lg:table-cell font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Response
                  </TableHead>
                  <TableHead className="font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Error rate
                  </TableHead>
                  <TableHead className="w-12 text-right font-secondary text-caption uppercase tracking-wide text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {endpoints.map((row) => {
                  const charts = buildWebhookEndpointCharts(deliveries, row.id);
                  return (
                    <TableRow
                      key={row.id}
                      className="cursor-pointer"
                      tabIndex={0}
                      onClick={() => openRowDetails(row)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openRowDetails(row);
                        }
                      }}
                    >
                      <TableCell className="text-center">
                        <div
                          className="mx-auto flex size-8 items-center justify-center rounded-full border border-border bg-muted/40 text-primary"
                          aria-hidden
                        >
                          <Zap className="size-4" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-foreground">{row.displayName ?? "Webhook"}</p>
                        <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-muted-foreground">
                          {row.url}
                        </p>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.isActive ? "success" : "secondary"}>
                          {row.isActive ? "ACTIVE" : "DISABLED"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-caption">{row.protocolVersion ?? "v1"}</TableCell>
                      <TableCell className="text-caption text-muted-foreground">
                        {row.events?.length ?? 0} events
                      </TableCell>
                      <TableCell>
                        <WebhookMiniSparkline values={charts.activitySeries} />
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <WebhookMiniSparkline values={charts.responseProxySeries} normalized />
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            "font-tertiary text-caption tabular-nums",
                            charts.errorRatePct > 0 ? "text-destructive" : "text-muted-foreground"
                          )}
                        >
                          {charts.errorRatePct}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-8" aria-label="Open row menu">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-40">
                            <DropdownMenuItem onClick={() => setDetailsEndpoint(resolveEndpointRow(row))}>
                              <PanelRight className="mr-2 size-4" aria-hidden />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(row)}>
                              <Pencil className="mr-2 size-4" aria-hidden />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              disabled={patching}
                              onClick={() => void toggleActive(row)}
                            >
                              {row.isActive ? (
                                <>
                                  <ZapOff className="mr-2 size-4" aria-hidden />
                                  Disable
                                </>
                              ) : (
                                <>
                                  <Zap className="mr-2 size-4" aria-hidden />
                                  Enable
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setPendingDelete(row)}>
                              <Trash2 className="mr-2 size-4" aria-hidden />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      <WebhookDestinationDialog
        key={webhookFormKey}
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={editInitial}
        nestedInParentDialog={Boolean(detailsEndpoint && formOpen)}
        onSaved={(row) => {
          if (!row) return;
          setDetailsEndpoint((prev) => (prev && prev.id === row.id ? { ...prev, ...row } : prev));
        }}
      />

      <WebhookDetailsDialog
        open={Boolean(detailsEndpoint)}
        onOpenChange={(o) => {
          if (!o) setDetailsEndpoint(null);
        }}
        endpoint={resolvedDetailsEndpoint}
        skipMerchantApi={skipMerchantApi}
        onRequestEdit={handleRequestEditFromDetails}
      />

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <DialogContent className="border-border bg-card text-card-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete destination?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <span className="font-medium text-foreground">{pendingDelete?.displayName ?? "this endpoint"}</span>{" "}
              and its delivery history for this environment. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" disabled={deleting} onClick={() => void confirmDelete()}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

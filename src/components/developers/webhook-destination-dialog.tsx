"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import {
  MERCHANT_WEBHOOK_EVENT_IDS,
  MERCHANT_WEBHOOK_EVENT_OPTIONS,
  type MerchantWebhookEventId,
} from "@/lib/merchant-webhook-events";
import type { MerchantWebhookEndpointRow, MerchantWebhookEventType } from "@/types/merchant-api";
import {
  useCreateMerchantWebhookEndpointMutation,
  usePatchMerchantWebhookEndpointMutation,
} from "@/store/merchant-api";

/** Default selected event for new destinations (matches “one chip pre-selected” UX). */
export const DEFAULT_CREATE_WEBHOOK_EVENT: MerchantWebhookEventId = MERCHANT_WEBHOOK_EVENT_IDS[0];

type WebhookDestinationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: MerchantWebhookEndpointRow | null;
  /** Opened while another dialog (e.g. webhook details) is already open — skip second backdrop and use non-modal behavior. */
  nestedInParentDialog?: boolean;
  /** Called after a successful create or patch so parents can sync local state (e.g. details panel `hasSecret`). */
  onSaved?: (row: MerchantWebhookEndpointRow | null) => void;
};

function parseSelectedEvents(row: MerchantWebhookEndpointRow | null | undefined): Set<MerchantWebhookEventId> {
  const next = new Set<MerchantWebhookEventId>();
  if (!row?.events?.length) return next;
  const allowed = new Set(MERCHANT_WEBHOOK_EVENT_OPTIONS.map((o) => o.id));
  for (const raw of row.events) {
    const e = typeof raw === "string" ? raw.trim() : "";
    if (allowed.has(e as MerchantWebhookEventId)) next.add(e as MerchantWebhookEventId);
  }
  return next;
}

export function WebhookDestinationDialog({
  open,
  onOpenChange,
  mode,
  initial,
  nestedInParentDialog = false,
  onSaved,
}: WebhookDestinationDialogProps) {
  const [displayName, setDisplayName] = React.useState(
    () => (mode === "edit" && initial ? (initial.displayName ?? "") : "")
  );
  const [url, setUrl] = React.useState(() => (mode === "edit" && initial ? (initial.url ?? "") : ""));
  const [protocolVersion, setProtocolVersion] = React.useState<"v1">("v1");
  const [selectedEvents, setSelectedEvents] = React.useState<Set<MerchantWebhookEventId>>(() =>
    mode === "edit" && initial
      ? parseSelectedEvents(initial)
      : new Set<MerchantWebhookEventId>([DEFAULT_CREATE_WEBHOOK_EVENT])
  );
  const [formError, setFormError] = React.useState<string | null>(null);

  const [createEndpoint, { isLoading: creating }] = useCreateMerchantWebhookEndpointMutation();
  const [patchEndpoint, { isLoading: patching }] = usePatchMerchantWebhookEndpointMutation();

  const toggleEvent = (id: MerchantWebhookEventId) => {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size <= 1) return next;
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const totalEvents = MERCHANT_WEBHOOK_EVENT_OPTIONS.length;
  const selectedCount = selectedEvents.size;
  const canSubmit =
    displayName.trim().length > 0 &&
    url.trim().length > 0 &&
    selectedCount > 0 &&
    !creating &&
    !patching;

  const handleSubmit = async () => {
    setFormError(null);
    const name = displayName.trim();
    const u = url.trim();
    if (!name) {
      setFormError("Enter a name for this destination.");
      return;
    }
    if (!u) {
      setFormError("Enter a webhook URL.");
      return;
    }
    let urlOk = false;
    try {
      const parsed = new URL(u);
      urlOk = parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      urlOk = false;
    }
    if (!urlOk) {
      setFormError("Enter a valid http(s) URL.");
      return;
    }
    if (selectedCount === 0) {
      setFormError("Select at least one event.");
      return;
    }

    const events = Array.from(selectedEvents) as MerchantWebhookEventType[];

    try {
      if (mode === "create") {
        const created = await createEndpoint({
          displayName: name,
          url: u,
          events,
          protocolVersion: "v1",
        }).unwrap();
        onSaved?.(created);
      } else if (initial) {
        const updated = await patchEndpoint({
          id: initial.id,
          patch: {
            displayName: name,
            url: u,
            events,
            protocolVersion: "v1",
          },
        }).unwrap();
        onSaved?.(updated);
      }
      onOpenChange(false);
    } catch {
      setFormError(mode === "create" ? "Could not add destination." : "Could not save changes.");
    }
  };

  const submitting = creating || patching;

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={!nestedInParentDialog}>
      <DialogContent
        className={cn(
          "max-w-3xl gap-0 border-border bg-card p-0 text-card-foreground shadow-lg sm:max-w-3xl",
          nestedInParentDialog && "z-220"
        )}
        showClose
        hideOverlay={nestedInParentDialog}
      >
        <div className="border-b border-border px-6 pb-3 pt-4">
          <DialogHeader className="space-y-0 p-0 text-left">
            <div className="flex min-w-0 flex-col gap-1.5">
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
                  {mode === "create" ? (
                    <Plus className="size-4 sm:size-[18px]" />
                  ) : (
                    <Pencil className="size-4 sm:size-[18px]" />
                  )}
                </div>
                <DialogTitle className="min-w-0 flex-1 text-base font-semibold tracking-tight text-primary sm:text-lg">
                  {mode === "create" ? "Add destination" : "Edit destination"}
                </DialogTitle>
              </div>
              <DialogDescription className="max-w-3xl pl-0.5 font-secondary text-[11px] leading-relaxed text-muted-foreground sm:text-xs">
                {mode === "create"
                  ? "Configure a new endpoint to receive webhook events. A signing secret is created automatically for each destination."
                  : "Update this destination’s URL or subscribed events."}
              </DialogDescription>
            </div>
          </DialogHeader>
        </div>

        <div className="max-h-[min(70vh,640px)] space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Production API"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="wh-version">Webhook version</Label>
              <Select value={protocolVersion} onValueChange={(v) => setProtocolVersion(v as "v1")}>
                <SelectTrigger id="wh-version" className="w-full">
                  <SelectValue placeholder="Version" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="v1">
                    <span className="font-medium text-primary">v1</span>
                    <span className="ml-2 text-caption text-muted-foreground">RECOMMENDED</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="wh-url">Webhook URL</Label>
            <Input
              id="wh-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/webhooks/klyra"
              autoComplete="url"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-foreground">Subscribed events</Label>
              <span className="font-mono text-caption text-muted-foreground">
                {selectedCount}/{totalEvents}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {MERCHANT_WEBHOOK_EVENT_OPTIONS.map((opt) => {
                const on = selectedEvents.has(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleEvent(opt.id)}
                    className={cn(
                      "rounded-full border px-3 py-2 text-left transition-colors",
                      on
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-border bg-background text-muted-foreground hover:border-border/80 hover:text-foreground"
                    )}
                  >
                    <span className="block font-mono text-[11px] font-medium leading-tight">{opt.id}</span>
                    <span className="mt-0.5 block font-secondary text-[10px] leading-tight text-muted-foreground">
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {formError ? (
            <p className="text-caption text-destructive" role="alert">
              {formError}
            </p>
          ) : null}
        </div>

        <DialogFooter className="border-t border-border bg-muted/20 px-6 py-4 sm:justify-end">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit}>
            {submitting ? "Saving…" : mode === "create" ? "Add destination" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

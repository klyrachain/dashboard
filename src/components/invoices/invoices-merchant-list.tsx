"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import type { InvoiceListItem } from "@/lib/data-invoices";
import { InvoicesTable } from "@/components/invoices/invoices-table";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type InvoicesMerchantListProps = {
  page: number;
  limit: number;
  status?: string;
  statusFilter?: string;
};

function buildSearch(page: number, limit: number, status?: string): string {
  const p = new URLSearchParams();
  p.set("page", String(page));
  p.set("limit", String(limit));
  if (status) p.set("status", status);
  return p.toString();
}

function parseListEnvelope(raw: unknown): {
  items: InvoiceListItem[];
  meta: { page: number; limit: number; total: number };
  error: string | null;
} {
  const envelope =
    raw && typeof raw === "object"
      ? (raw as {
          success?: boolean;
          data?: unknown[];
          meta?: { page: number; limit: number; total: number };
          error?: string;
        })
      : null;
  if (!envelope || envelope.success === false) {
    return {
      items: [],
      meta: { page: 1, limit: 20, total: 0 },
      error: envelope?.error ?? "Unable to load invoices",
    };
  }
  const list = Array.isArray(envelope.data) ? envelope.data : [];
  const meta = envelope.meta ?? { page: 1, limit: 20, total: list.length };
  const items: InvoiceListItem[] = list.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: String(r.id ?? ""),
      invoiceNumber: String(r.invoiceNumber ?? ""),
      status: r.status as InvoiceListItem["status"],
      amount: Number(r.amount) || 0,
      currency: String(r.currency ?? "USD"),
      customer: String(r.customer ?? ""),
      issued: new Date(String(r.issued ?? 0)),
      dueDate: new Date(String(r.dueDate ?? 0)),
      paidAt: r.paidAt ? new Date(String(r.paidAt)) : null,
    };
  });
  return { items, meta, error: null };
}

export function InvoicesMerchantList({
  page,
  limit,
  status,
  statusFilter,
}: InvoicesMerchantListProps) {
  const [items, setItems] = useState<InvoiceListItem[]>([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    await Promise.resolve();
    setLoading(true);
    setError(null);
    const token = getBusinessAccessToken();
    const businessId = getStoredActiveBusinessId();
    const env = getStoredMerchantEnvironment();
    if (!token?.trim() || !businessId?.trim()) {
      setItems([]);
      setMeta({ page: 1, limit: 20, total: 0 });
      setError("Sign in and select a business to load invoices.");
      setLoading(false);
      return;
    }

    const qs = buildSearch(page, limit, status);
    const headers: Record<string, string> = {
      Accept: "application/json",
      Authorization: `Bearer ${token.trim()}`,
      "X-Business-Id": businessId.trim(),
    };
    if (env) headers["x-merchant-environment"] = env;

    try {
      const res = await fetch(`/api/invoices?${qs}`, { headers });
      const data: unknown = await res.json().catch(() => ({}));
      if (!res.ok) {
        const errObj = data && typeof data === "object" ? (data as { error?: string }) : {};
        setItems([]);
        setMeta({ page: 1, limit: 20, total: 0 });
        setError(errObj.error ?? `Request failed (${res.status})`);
        setLoading(false);
        return;
      }
      const parsed = parseListEnvelope(data);
      if (parsed.error) {
        setItems([]);
        setMeta(parsed.meta);
        setError(parsed.error);
      } else {
        setItems(parsed.items);
        setMeta(parsed.meta);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "Unable to load invoices";
      setItems([]);
      setMeta({ page: 1, limit: 20, total: 0 });
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [page, limit, status]);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  const empty = !loading && !error && items.length === 0;

  return (
    <>
      {error && (
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}
      <div className="rounded-lg border border-slate-200 bg-white font-tertiary text-table tabular-nums">
        {loading ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice No.</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : empty ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <p className="text-sm font-medium text-slate-600">It&apos;s quiet here</p>
            <p className="text-xs text-slate-500">
              No invoices yet. Create one to get started.
            </p>
          </div>
        ) : (
          <InvoicesTable
            data={items}
            meta={meta}
            statusFilter={statusFilter}
          />
        )}
      </div>
    </>
  );
}

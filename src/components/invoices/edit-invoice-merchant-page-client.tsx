"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  invoiceFromCoreApiData,
  serializeInvoice,
  type SerializedInvoice,
} from "@/lib/data-invoices";
import {
  getBusinessAccessToken,
  getStoredActiveBusinessId,
  getStoredMerchantEnvironment,
} from "@/lib/businessAuthStorage";
import { ChevronLeft } from "lucide-react";
import { CreateInvoicePageClient } from "@/components/invoices/create-invoice-page-client";

type EditInvoiceMerchantPageClientProps = {
  invoiceId: string;
};

export function EditInvoiceMerchantPageClient({ invoiceId }: EditInvoiceMerchantPageClientProps) {
  const [invoice, setInvoice] = useState<SerializedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadInvoice = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setError(null);
      }

      const token = getBusinessAccessToken();
      const businessId = getStoredActiveBusinessId();
      const env = getStoredMerchantEnvironment();
      if (!token?.trim() || !businessId?.trim()) {
        setError("Sign in and select a business to edit invoices.");
        if (!silent) setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
        "X-Business-Id": businessId.trim(),
      };
      if (env) headers["x-merchant-environment"] = env;

      try {
        const res = await fetch(`/api/invoices/${encodeURIComponent(invoiceId)}`, {
          headers,
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errObj =
            data && typeof data === "object" ? (data as { error?: string }) : {};
          if (!silent) {
            setError(errObj.error ?? `Request failed (${res.status})`);
          }
          if (!silent) setLoading(false);
          return;
        }
        const envelope = data as { success?: boolean; data?: unknown };
        if (!envelope.success || envelope.data == null) {
          if (!silent) {
            setError("Invoice not found");
            setLoading(false);
          }
          return;
        }
        const parsed = invoiceFromCoreApiData(envelope.data);
        if (!parsed) {
          if (!silent) {
            setError("Invalid invoice data");
            setLoading(false);
          }
          return;
        }
        if (parsed.status === "Paid" || parsed.status === "Cancelled") {
          if (!silent) {
            setError("This invoice cannot be edited.");
            setLoading(false);
          }
          return;
        }
        setInvoice(serializeInvoice(parsed));
      } catch (e) {
        if (!silent) {
          setError(e instanceof Error ? e.message : "Unable to load invoice");
          setLoading(false);
        }
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [invoiceId]
  );

  useEffect(() => {
    void loadInvoice();
  }, [loadInvoice]);

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6 font-primary text-body">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="mx-auto max-w-lg space-y-4 p-6 font-primary text-body">
        <Button variant="ghost" size="sm" className="gap-2 px-0" asChild>
          <Link href={`/invoices/${encodeURIComponent(invoiceId)}`}>
            <ChevronLeft className="size-4" aria-hidden />
            Back to invoice
          </Link>
        </Button>
        <p className="text-sm text-destructive" role="alert">
          {error ?? "Could not load invoice."}
        </p>
      </div>
    );
  }

  return (
    <CreateInvoicePageClient
      key={invoice.id}
      editInvoiceId={invoice.id}
      initialInvoice={invoice}
    />
  );
}

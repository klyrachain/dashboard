"use client";

import { useEffect, useState } from "react";
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
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";
import { InvoiceDetailView } from "@/components/invoices/invoice-detail-view";

type InvoiceDetailMerchantClientProps = {
  id: string;
};

export function InvoiceDetailMerchantClient({ id }: InvoiceDetailMerchantClientProps) {
  const [invoice, setInvoice] = useState<SerializedInvoice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const token = getBusinessAccessToken();
      const businessId = getStoredActiveBusinessId();
      const env = getStoredMerchantEnvironment();
      if (!token?.trim() || !businessId?.trim()) {
        setError("Sign in and select a business to load invoices.");
        setLoading(false);
        return;
      }

      const headers: Record<string, string> = {
        Accept: "application/json",
        Authorization: `Bearer ${token.trim()}`,
        "X-Business-Id": businessId.trim(),
      };
      if (env) headers["x-merchant-environment"] = env;

      try {
        const res = await fetch(`/api/invoices/${encodeURIComponent(id)}`, {
          headers,
        });
        const data: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const errObj =
            data && typeof data === "object" ? (data as { error?: string }) : {};
          setError(errObj.error ?? `Request failed (${res.status})`);
          setLoading(false);
          return;
        }
        const envelope = data as { success?: boolean; data?: unknown };
        if (!envelope.success || envelope.data == null) {
          setError("Invoice not found");
          setLoading(false);
          return;
        }
        const parsed = invoiceFromCoreApiData(envelope.data);
        if (!parsed) {
          setError("Invalid invoice data");
          setLoading(false);
          return;
        }
        setInvoice(serializeInvoice(parsed));
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load invoice");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-4">
        <div
          className="rounded-lg px-4 py-3 font-secondary text-caption text-amber-800"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
        <Button asChild variant="outline">
          <Link href="/invoices">Back to invoices</Link>
        </Button>
      </div>
    );
  }

  if (!invoice) return null;

  return <InvoiceDetailView invoice={invoice} />;
}

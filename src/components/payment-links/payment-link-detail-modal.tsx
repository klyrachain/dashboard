"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { PaymentLinkRow } from "@/lib/data-payment-links";

type PaymentLinkDetailModalProps = {
  request: PaymentLinkRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function getStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "success" | "outline" {
  switch (status) {
    case "Paid":
      return "success";
    case "Expired":
    case "Cancelled":
      return "destructive";
    case "Pending":
    default:
      return "secondary";
  }
}

export function PaymentLinkDetailModal({
  request,
  open,
  onOpenChange,
}: PaymentLinkDetailModalProps) {
  if (!request) return null;

  const amountLabel = `${request.currency} ${request.amount}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Request details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 text-sm">
          <p className="text-slate-700">
            You sent a request of {amountLabel} to {request.customer}
          </p>
          <dl className="grid gap-3">
            <div>
              <dt className="text-xs font-medium text-slate-500">Status</dt>
              <dd className="mt-0.5">
                <Badge variant={getStatusVariant(request.status)}>
                  {request.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Sent</dt>
              <dd className="mt-0.5 text-slate-900">
                {format(new Date(request.requested), "MMM d, yyyy")}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Code</dt>
              <dd className="mt-0.5 font-mono text-slate-900">
                {request.code}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">
                Offline Reference
              </dt>
              <dd className="mt-0.5 font-mono text-slate-900">
                {request.offlineReference}
              </dd>
            </div>
          </dl>
        </div>
      </DialogContent>
    </Dialog>
  );
}

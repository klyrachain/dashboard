"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sendInvoiceAction, createInvoiceAction } from "@/app/invoices/actions";
import {
  createInvoiceViaMerchantProxy,
  hasMerchantInvoicesAuth,
  sendInvoiceViaMerchantProxy,
} from "@/lib/merchant-invoices-proxy-client";

type SendInvoiceModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, sends this invoice to the given email (detail page). */
  invoiceId?: string;
  /** Pre-fill recipient (e.g. invoice.billedTo). */
  initialEmail?: string;
  onSuccess?: () => void;
};

export function SendInvoiceModal({
  open,
  onOpenChange,
  invoiceId,
  initialEmail = "",
  onSuccess,
}: SendInvoiceModalProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const [amount, setAmount] = useState("0");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setEmail(initialEmail);
      setError(null);
    });
  }, [open, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (invoiceId) {
      if (hasMerchantInvoicesAuth()) {
        const sent = await sendInvoiceViaMerchantProxy(invoiceId, email);
        setIsSubmitting(false);
        if (sent.success) {
          onOpenChange(false);
          onSuccess?.();
          router.refresh();
        } else {
          setError(sent.error ?? "Failed to send");
        }
      } else {
        const result = await sendInvoiceAction(invoiceId, email);
        setIsSubmitting(false);
        if (result.success) {
          onOpenChange(false);
          onSuccess?.();
        } else {
          setError(result.error ?? "Failed to send");
        }
      }
    } else {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + Math.max(1, parseInt(dueDays, 10) || 14));
      const amountNum = Math.max(0, parseFloat(amount) || 0);
      const createBody = {
        billedTo: email.trim(),
        subject: subject.trim() || "Invoice",
        dueDate: dueDate.toISOString(),
        lineItems: [
          {
            productName: subject.trim() || "Invoice",
            qty: 1,
            unitPrice: amountNum,
            amount: amountNum,
          },
        ],
        sendNow: true as const,
      };

      if (hasMerchantInvoicesAuth()) {
        const created = await createInvoiceViaMerchantProxy(createBody);
        setIsSubmitting(false);
        if (created.success) {
          router.push(`/invoices/${created.id}`);
          router.refresh();
          onOpenChange(false);
        } else {
          setError(created.error ?? "Failed to create invoice");
        }
        return;
      }

      try {
        const result = await createInvoiceAction(createBody);
        setIsSubmitting(false);
        setError(result.error ?? "Failed to create invoice");
      } catch {
        setIsSubmitting(false);
        onOpenChange(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="send-invoice-email">Customer email</Label>
            <Input
              id="send-invoice-email"
              type="email"
              placeholder="customer@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="send-invoice-subject">Subject</Label>
            <Input
              id="send-invoice-subject"
              placeholder="e.g. Service per January 2026"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          {!invoiceId && (
            <>
              <div className="space-y-2">
                <Label htmlFor="send-invoice-amount">Amount (USD)</Label>
                <Input
                  id="send-invoice-amount"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="send-invoice-due">Due in (days)</Label>
                <Input
                  id="send-invoice-due"
                  type="number"
                  min={1}
                  value={dueDays}
                  onChange={(e) => setDueDays(e.target.value)}
                />
              </div>
            </>
          )}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useState, useEffect } from "react";
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
import { sendInvoiceAction } from "@/app/invoices/actions";

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
  const [email, setEmail] = useState(initialEmail);
  const [subject, setSubject] = useState("");
  const [dueDays, setDueDays] = useState("14");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setEmail(initialEmail);
      setError(null);
    }
  }, [open, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    if (invoiceId) {
      const result = await sendInvoiceAction(invoiceId, email);
      setIsSubmitting(false);
      if (result.success) {
        onOpenChange(false);
        onSuccess?.();
      } else {
        setError(result.error ?? "Failed to send");
      }
    } else {
      // New invoice send (list page): mock
      await new Promise((r) => setTimeout(r, 600));
      setIsSubmitting(false);
      setEmail("");
      setSubject("");
      setDueDays("14");
      onOpenChange(false);
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

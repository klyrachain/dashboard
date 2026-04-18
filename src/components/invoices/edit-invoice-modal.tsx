"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
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
import type { SerializedInvoice } from "@/lib/data-invoices";
import { updateInvoiceAction } from "@/app/invoices/actions";

type EditInvoiceModalProps = {
  invoice: SerializedInvoice;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditInvoiceModal({
  invoice,
  open,
  onOpenChange,
  onSuccess,
}: EditInvoiceModalProps) {
  const [subject, setSubject] = useState(invoice.subject);
  const [dueDate, setDueDate] = useState(
    format(new Date(invoice.dueDate), "yyyy-MM-dd")
  );
  const [billedTo, setBilledTo] = useState(invoice.billedTo);
  const [billingDetails, setBillingDetails] = useState(invoice.billingDetails);
  const [termsAndConditions, setTermsAndConditions] = useState(
    invoice.termsAndConditions
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setSubject(invoice.subject);
      setDueDate(format(new Date(invoice.dueDate), "yyyy-MM-dd"));
      setBilledTo(invoice.billedTo);
      setBillingDetails(invoice.billingDetails);
      setTermsAndConditions(invoice.termsAndConditions);
      setError(null);
    });
  }, [open, invoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = await updateInvoiceAction(invoice.id, {
      subject,
      dueDate: new Date(dueDate).toISOString(),
      billedTo,
      billingDetails,
      termsAndConditions,
    });
    setIsSubmitting(false);
    if (result.success) {
      onOpenChange(false);
      onSuccess?.();
    } else {
      setError(result.error ?? "Update failed");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit invoice</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-subject">Subject</Label>
            <Input
              id="edit-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-due">Due date</Label>
            <Input
              id="edit-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-billedTo">Billed to</Label>
            <Input
              id="edit-billedTo"
              type="email"
              value={billedTo}
              onChange={(e) => setBilledTo(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-billingDetails">Billing details</Label>
            <Input
              id="edit-billingDetails"
              value={billingDetails}
              onChange={(e) => setBillingDetails(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-terms">Terms & Condition</Label>
            <textarea
              id="edit-terms"
              className="flex min-h-[80px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={termsAndConditions}
              onChange={(e) => setTermsAndConditions(e.target.value)}
              rows={3}
            />
          </div>
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
              {isSubmitting ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

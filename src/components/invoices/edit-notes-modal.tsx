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
import { Label } from "@/components/ui/label";
import { updateInvoiceNotesAction } from "@/app/invoices/actions";
import { hasMerchantInvoicesAuth, updateInvoiceViaMerchantProxy } from "@/lib/merchant-invoices-proxy-client";

type EditNotesModalProps = {
  invoiceId: string;
  notesContent: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditNotesModal({
  invoiceId,
  notesContent,
  open,
  onOpenChange,
  onSuccess,
}: EditNotesModalProps) {
  const [notes, setNotes] = useState(notesContent);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      setNotes(notesContent);
      setError(null);
    });
  }, [open, notesContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    const result = hasMerchantInvoicesAuth()
      ? await updateInvoiceViaMerchantProxy(invoiceId, { notesContent: notes })
      : await updateInvoiceNotesAction(invoiceId, notes);
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
          <DialogTitle>Edit notes</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-notes">Notes</Label>
            <textarea
              id="edit-notes"
              className="flex min-h-[120px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={5}
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

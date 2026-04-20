"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KybBusinessAdminRow } from "@/lib/data-kyb-admin";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { showStatus } from "@/store/status-indicator-slice";
import { overrideBusinessKybById, resetBusinessKybById } from "./kyb-admin-actions";

type Props = {
  initialBq: string;
  rows: KybBusinessAdminRow[];
};

type ConfirmState = null | { action: "reset" | "approve" | "decline"; id: string; name: string };

export function KybBusinessAdminClient({ initialBq, rows }: Props) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bq, setBq] = useState(initialBq);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (bq.trim()) next.set("bq", bq.trim());
    else next.delete("bq");
    router.push(`/connect/kyc${next.toString() ? `?${next}` : ""}`);
  }

  function runConfirmedAction() {
    if (!confirm) return;
    const { action, id } = confirm;
    setConfirm(null);
    startTransition(async () => {
      let out: { ok: boolean; message?: string };
      if (action === "reset") {
        out = await resetBusinessKybById(id);
      } else {
        out = await overrideBusinessKybById(id, action === "approve" ? "approved" : "declined");
      }
      dispatch(
        showStatus({
          message: out.message ?? (out.ok ? "Updated." : "Request failed."),
          type: out.ok ? "saved" : "error",
        })
      );
      if (out.ok) router.refresh();
    });
  }

  const confirmCopy =
    confirm == null
      ? { title: "", description: "", confirmLabel: "", variant: "default" as const }
      : confirm.action === "reset"
        ? {
            title: "Reset KYB?",
            description: `Clear KYB state for ${confirm.name}?`,
            confirmLabel: "Reset",
            variant: "default" as const,
          }
        : confirm.action === "approve"
          ? {
              title: "Approve (database only)?",
              description: `Set ${confirm.name} to approved in the database.`,
              confirmLabel: "Approve",
              variant: "secondary" as const,
            }
          : {
              title: "Decline (database only)?",
              description: `Set ${confirm.name} to declined in the database.`,
              confirmLabel: "Decline",
              variant: "destructive" as const,
            };

  return (
    <div className="space-y-3 font-primary text-body">
      <h2 className="text-lg font-semibold tracking-tight">Business KYB</h2>

      <AdminConfirmDialog
        open={confirm != null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        confirmVariant={confirmCopy.variant}
        pending={pending}
        onConfirm={runConfirmedAction}
      />

      <form onSubmit={applySearch} className="flex max-w-xl flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label htmlFor="kyb-q" className="font-secondary text-caption text-muted-foreground">
            Search
          </label>
          <Input
            id="kyb-q"
            value={bq}
            onChange={(e) => setBq(e.target.value)}
            placeholder="Name, slug, email, id"
            autoComplete="off"
            className="border border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted/40 font-secondary text-caption uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Slug</th>
              <th className="px-3 py-2">KYB</th>
              <th className="px-3 py-2">Session</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                  No matches.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-border/80 last:border-0">
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.name}</span>
                    <span className="ml-2 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.slug}</td>
                  <td className="px-3 py-2">{r.kybStatus}</td>
                  <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                    {r.kybDiditSessionId ? `${r.kybDiditSessionId.slice(0, 12)}…` : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "reset", id: r.id, name: r.name })}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "approve", id: r.id, name: r.name })}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "decline", id: r.id, name: r.name })}
                      >
                        Decline
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

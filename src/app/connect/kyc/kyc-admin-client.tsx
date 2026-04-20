"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { useDispatch } from "react-redux";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeerRampKycUserRow } from "@/lib/data-peer-ramp-kyc";
import { AdminConfirmDialog } from "@/components/admin/admin-confirm-dialog";
import { showStatus } from "@/store/status-indicator-slice";
import { overridePeerRampKycByEmail, resetPeerRampKycByEmail } from "./actions";

type Props = {
  initialQ: string;
  rows: PeerRampKycUserRow[];
};

type ConfirmState =
  | null
  | { action: "reset" | "approve" | "decline"; email: string };

export function KycAdminClient({ initialQ, rows }: Props) {
  const dispatch = useDispatch();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    router.push(`/connect/kyc${next.toString() ? `?${next}` : ""}`);
  }

  function runConfirmedAction() {
    if (!confirm) return;
    const { action, email } = confirm;
    setConfirm(null);
    startTransition(async () => {
      let out: { ok: boolean; message?: string };
      if (action === "reset") {
        out = await resetPeerRampKycByEmail(email);
      } else {
        out = await overridePeerRampKycByEmail(
          email,
          action === "approve" ? "approved" : "declined"
        );
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
            title: "Reset KYC?",
            description: `Clear verification state for ${confirm.email}?`,
            confirmLabel: "Reset",
            variant: "default" as const,
          }
        : confirm.action === "approve"
          ? {
              title: "Approve (database only)?",
              description: `Set ${confirm.email} to approved in the database.`,
              confirmLabel: "Approve",
              variant: "secondary" as const,
            }
          : {
              title: "Decline (database only)?",
              description: `Set ${confirm.email} to declined in the database.`,
              confirmLabel: "Decline",
              variant: "destructive" as const,
            };

  return (
    <div className="space-y-3 font-primary text-body">
      <h2 className="text-lg font-semibold tracking-tight">Person verification</h2>

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
          <label htmlFor="kyc-q" className="font-secondary text-caption text-muted-foreground">
            Email
          </label>
          <Input
            id="kyc-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="user@example.com"
            autoComplete="off"
            className="border border-slate-200 bg-white shadow-sm focus-visible:ring-2 focus-visible:ring-slate-200"
          />
        </div>
        <Button type="submit" variant="secondary" size="sm">
          Search
        </Button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[800px] border-collapse text-left text-sm">
          <thead className="border-b border-border bg-muted/40 font-secondary text-caption uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Product</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">KYC status</th>
              <th className="px-3 py-2">Provider</th>
              <th className="px-3 py-2">Verified</th>
              <th className="px-3 py-2">Sessions</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">
                  No matches.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.source}-${r.email}`} className="border-b border-border/80 last:border-0">
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.source === "portal" ? "Business portal" : "Ramp consumer"}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.email}</td>
                  <td className="px-3 py-2">{r.kycStatus ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.kycProvider ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.kycVerifiedAt ? new Date(r.kycVerifiedAt).toLocaleString() : "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {r.sessions.length === 0
                      ? "—"
                      : r.sessions.map((s) => `${s.provider}:${s.status}`).join(", ")}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap justify-end gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "reset", email: r.email })}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "approve", email: r.email })}
                      >
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => setConfirm({ action: "decline", email: r.email })}
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

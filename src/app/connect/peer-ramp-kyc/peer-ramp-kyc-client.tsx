"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeerRampKycUserRow } from "@/lib/data-peer-ramp-kyc";
import { overridePeerRampKycByEmail, resetPeerRampKycByEmail } from "./actions";

type Props = {
  initialQ: string;
  rows: PeerRampKycUserRow[];
};

export function PeerRampKycClient({ initialQ, rows }: Props) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    router.push(`/connect/peer-ramp-kyc${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="space-y-4 font-primary text-body">
      {banner ? (
        <div
          className={`rounded-lg px-4 py-3 font-secondary text-caption ${
            banner.type === "ok"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border border-amber-200 bg-amber-50 text-amber-900"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      <form onSubmit={applySearch} className="flex max-w-xl flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1 space-y-1">
          <label htmlFor="kyc-q" className="font-secondary text-caption text-muted-foreground">
            Search email
          </label>
          <Input
            id="kyc-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="user@example.com"
            autoComplete="off"
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
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No Peer Ramp users match this search.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.email} className="border-b border-border/80 last:border-0">
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
                        onClick={() => {
                          if (!window.confirm(`Reset KYC for ${r.email}? They can redo verification.`)) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await resetPeerRampKycByEmail(r.email);
                            setBanner({
                              type: out.ok ? "ok" : "err",
                              text: out.message ?? (out.ok ? "Done." : "Failed."),
                            });
                            if (out.ok) router.refresh();
                          });
                        }}
                      >
                        Reset
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Mark ${r.email} approved in our database only?`)) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await overridePeerRampKycByEmail(r.email, "approved");
                            setBanner({
                              type: out.ok ? "ok" : "err",
                              text: out.message ?? (out.ok ? "Done." : "Failed."),
                            });
                            if (out.ok) router.refresh();
                          });
                        }}
                      >
                        Approve (DB)
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Mark ${r.email} declined in our database only?`)) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await overridePeerRampKycByEmail(r.email, "declined");
                            setBanner({
                              type: out.ok ? "ok" : "err",
                              text: out.message ?? (out.ok ? "Done." : "Failed."),
                            });
                            if (out.ok) router.refresh();
                          });
                        }}
                      >
                        Decline (DB)
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

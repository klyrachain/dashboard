"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PeerRampKycUserRow } from "@/lib/data-peer-ramp-kyc";
import { overridePeerRampKycByEmail, resetPeerRampKycByEmail } from "./actions";

type Props = {
  initialQ: string;
  rows: PeerRampKycUserRow[];
};

export function KycAdminClient({ initialQ, rows }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(initialQ);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (q.trim()) next.set("q", q.trim());
    else next.delete("q");
    router.push(`/connect/kyc${next.toString() ? `?${next}` : ""}`);
  }

  return (
    <div className="space-y-4 font-primary text-body">
      <h2 className="text-lg font-semibold tracking-tight">Person verification queue</h2>
      <p className="max-w-3xl text-caption text-muted-foreground leading-relaxed">
        In the business product, <strong>each member</strong> completes their own user KYC on the dashboard when
        required. <strong>Ramp consumer</strong> rows are separate: they use the Peer Ramp app only. This queue is
        for <strong>platform operators</strong> (search, reset, DB overrides) — not where end users file KYC.
      </p>
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
                        onClick={() => {
                          if (!window.confirm(`Reset KYC for ${r.email}?`)) return;
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
                          if (!window.confirm(`Approve KYC (database only) for ${r.email}?`)) return;
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
                        Approve
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={pending}
                        onClick={() => {
                          if (!window.confirm(`Decline KYC (database only) for ${r.email}?`)) return;
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

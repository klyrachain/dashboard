"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KybBusinessAdminRow } from "@/lib/data-kyb-admin";
import { overrideBusinessKybById, resetBusinessKybById } from "./kyb-admin-actions";

type Props = {
  initialBq: string;
  rows: KybBusinessAdminRow[];
};

export function KybBusinessAdminClient({ initialBq, rows }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [bq, setBq] = useState(initialBq);
  const [banner, setBanner] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function applySearch(e: React.FormEvent) {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    if (bq.trim()) next.set("bq", bq.trim());
    else next.delete("bq");
    router.push(`/connect/kyc${next.toString() ? `?${next}` : ""}`);
  }

  return (
    <div className="space-y-4 font-primary text-body">
      <h2 className="text-lg font-semibold tracking-tight">KYB (business)</h2>
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
          <label htmlFor="kyb-q" className="font-secondary text-caption text-muted-foreground">
            Search
          </label>
          <Input
            id="kyb-q"
            value={bq}
            onChange={(e) => setBq(e.target.value)}
            placeholder="Name, slug, email, id"
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
                        onClick={() => {
                          if (!window.confirm("Reset KYB for this business?")) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await resetBusinessKybById(r.id);
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
                          if (!window.confirm("Approve KYB (database only)?")) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await overrideBusinessKybById(r.id, "approved");
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
                          if (!window.confirm("Decline KYB (database only)?")) return;
                          startTransition(async () => {
                            setBanner(null);
                            const out = await overrideBusinessKybById(r.id, "declined");
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

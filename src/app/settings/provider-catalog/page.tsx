import { getProviderCatalogData } from "@/lib/data-provider-catalog";
import { mapInvoiceLoadError } from "@/lib/user-feedback-copy";

export default async function ProviderCatalogSettingsPage() {
  const { ok, fonbnkAssets, countries, error } = await getProviderCatalogData();

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Provider catalog</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1 max-w-2xl">
          Fonbnk payout codes mirrored in Core and countries with provider flags (from seed and sync jobs). Use{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">POST /api/settings/providers/catalog/sync</code>{" "}
          or <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">pnpm run sync:providers</code> in Core to
          refresh.
        </p>
      </div>

      {error && (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-900"
          role="alert"
        >
          {mapInvoiceLoadError(error)}
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Fonbnk supported assets</h2>
        <p className="text-caption text-muted-foreground">
          {ok ? `${fonbnkAssets.length} row(s) (limit 500).` : "—"}
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-700">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Network</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Chain ID</th>
                <th className="px-3 py-2">Active</th>
              </tr>
            </thead>
            <tbody>
              {fonbnkAssets.map((row) => (
                <tr key={row.code} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2 text-slate-600">{row.network ?? "—"}</td>
                  <td className="px-3 py-2 text-slate-600">{row.asset ?? "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.chainId ?? "—"}</td>
                  <td className="px-3 py-2">{row.isActive ? "Yes" : "No"}</td>
                </tr>
              ))}
              {fonbnkAssets.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No assets returned. Check Core admin permissions and API key / session.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Countries</h2>
        <p className="text-caption text-muted-foreground">
          Filter <code className="rounded bg-slate-100 px-1 text-xs">supported=any</code> — Fonbnk and/or Paystack.
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 font-medium text-slate-700">
              <tr>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Name</th>
                <th className="px-3 py-2">Currency</th>
                <th className="px-3 py-2">Fonbnk</th>
                <th className="px-3 py-2">Paystack</th>
              </tr>
            </thead>
            <tbody>
              {countries.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-3 py-2 font-mono text-xs">{row.code}</td>
                  <td className="px-3 py-2">{row.name}</td>
                  <td className="px-3 py-2 font-mono text-xs">{row.currency}</td>
                  <td className="px-3 py-2">{row.supportedFonbnk ? "Yes" : "—"}</td>
                  <td className="px-3 py-2">{row.supportedPaystack ? "Yes" : "—"}</td>
                </tr>
              ))}
              {countries.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted-foreground">
                    No countries returned.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

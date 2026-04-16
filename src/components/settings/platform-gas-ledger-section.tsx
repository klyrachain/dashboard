import Link from "next/link";
import type { PlatformGasLedgerRow } from "@/lib/data-gas";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const REASON_FILTERS: { value: string; label: string }[] = [
  { value: "", label: "All entries" },
  { value: "SPONSORSHIP", label: "Sponsored (gas used)" },
  { value: "TOPUP", label: "Top-ups & credits" },
  { value: "ADJUSTMENT", label: "Adjustments" },
  { value: "REFUND", label: "Refunds" },
];

type PlatformGasLedgerSectionProps = {
  rows: PlatformGasLedgerRow[];
  meta: { page: number; limit: number; total: number };
  reasonFilter: string | undefined;
};

export function PlatformGasLedgerSection({
  rows,
  meta,
  reasonFilter,
}: PlatformGasLedgerSectionProps) {
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const page = meta.page;
  const basePath = "/settings/gas";

  function hrefForPage(nextPage: number, reason: string | undefined): string {
    const u = new URLSearchParams();
    if (nextPage > 1) u.set("ledgerPage", String(nextPage));
    if (reason?.trim()) u.set("ledgerReason", reason.trim());
    const q = u.toString();
    return q ? `${basePath}?${q}` : basePath;
  }

  return (
    <section className="space-y-4" aria-labelledby="gas-ledger-heading">
      <div>
        <h2
          id="gas-ledger-heading"
          className="text-lg font-semibold tracking-tight text-slate-900"
        >
          Gas ledger
        </h2>
        <p className="mt-1 font-secondary text-sm text-muted-foreground max-w-prose">
          Platform-wide sponsorship debits and credits. Filter to{" "}
          <strong>Sponsored (gas used)</strong> to see only spend from sponsored
          transactions.
        </p>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Ledger reason filters">
        {REASON_FILTERS.map((f) => {
          const active =
            (f.value === "" && !reasonFilter) ||
            (f.value !== "" && reasonFilter === f.value);
          return (
            <Link
              key={f.value || "all"}
              href={hrefForPage(1, f.value || undefined)}
              className={
                active
                  ? "rounded-full bg-slate-900 px-3 py-1 text-xs font-medium text-white"
                  : "rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              }
            >
              {f.label}
            </Link>
          );
        })}
      </nav>

      <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Business</TableHead>
              <TableHead>Direction</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Amount (USD)</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No ledger entries.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="whitespace-nowrap tabular-nums text-sm">
                    {new Date(r.createdAt).toLocaleString()}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-sm">
                    {r.businessName?.trim() ?? "—"}
                    {r.slug ? (
                      <span className="ml-1 text-muted-foreground">({r.slug})</span>
                    ) : null}
                  </TableCell>
                  <TableCell className="text-sm">{r.direction}</TableCell>
                  <TableCell className="text-sm">{r.reason}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    {r.amountUsd}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-4 text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages} ({meta.total} total)
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Link
                href={hrefForPage(page - 1, reasonFilter)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50"
              >
                Previous
              </Link>
            ) : null}
            {page < totalPages ? (
              <Link
                href={hrefForPage(page + 1, reasonFilter)}
                className="rounded-md border border-slate-200 px-3 py-1 font-medium hover:bg-slate-50"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}

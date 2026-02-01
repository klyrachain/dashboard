"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useGetFailedReportQuery,
  useGetRecentFailedQuery,
  useGetFailedValidationsQuery,
} from "@/store/validation-api";
import { AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const LIST_MAX_H = "max-h-[320px]";

function ReportKpis({ days = 7 }: { days?: number }) {
  const { data: report, isLoading, error } = useGetFailedReportQuery(days);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white">
            <CardContent className="pt-6">
              <div className="h-12 animate-pulse rounded bg-slate-100" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error || !report) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm text-amber-800">
            Failed to load validation report. Ensure Core API is up and x-api-key is set.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total (all time)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{report.total}</p>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last 24h
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{report.last24h}</p>
        </CardContent>
      </Card>
      <Card className="bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Last 7 days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-semibold">{report.last7d}</p>
        </CardContent>
      </Card>
    </div>
  );
}

const BY_CODE_PAGE_SIZE = 10;

function ByCodeChart({ days = 7 }: { days?: number }) {
  const [page, setPage] = useState(1);
  const { data: report, isLoading } = useGetFailedReportQuery(days);

  if (isLoading || !report || Object.keys(report.byCode).length === 0) {
    return null;
  }

  const entries = Object.entries(report.byCode).sort((a, b) => b[1] - a[1]);
  const totalPages = Math.max(1, Math.ceil(entries.length / BY_CODE_PAGE_SIZE));
  const start = (page - 1) * BY_CODE_PAGE_SIZE;
  const pageEntries = entries.slice(start, start + BY_CODE_PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-base">By error code (last {days} days)</CardTitle>
        <p className="text-xs text-muted-foreground">
          {entries.length} codes · page {page} of {totalPages}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className={`space-y-2 text-sm ${LIST_MAX_H} overflow-y-auto`}>
          {pageEntries.map(([code, count]) => (
            <li key={code} className="flex items-center justify-between pr-2">
              <span className="font-mono text-slate-600">{code}</span>
              <span className="font-medium">{count}</span>
            </li>
          ))}
        </ul>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={!canPrev}
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!canNext}
              aria-label="Next page"
            >
              Next
              <ChevronRight className="size-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DailyChart({ days = 7 }: { days?: number }) {
  const { data: report, isLoading } = useGetFailedReportQuery(days);

  if (isLoading || !report || report.daily.length === 0) {
    return null;
  }

  const chartData = report.daily.map((d) => ({
    date: d.date,
    count: d.count,
    label: `${d.date}: ${d.count}`,
  }));

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-base">Failures over time (last {days} days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                className="text-xs"
                tick={{ fill: "var(--muted-foreground)" }}
              />
              <YAxis className="text-xs" tick={{ fill: "var(--muted-foreground)" }} />
              <Tooltip
                content={({ active, payload }) =>
                  active && payload?.[0] ? (
                    <div className="rounded border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
                      {payload[0].payload.label}
                    </div>
                  ) : null
                }
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--amber-600)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

const RECENT_PAGE_SIZE = 10;
const RECENT_LIMIT_OPTIONS = [20, 50, 100, 200] as const;

function RecentFailedList() {
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const { data: items = [], isLoading, error } = useGetRecentFailedQuery(limit);

  const totalPages = Math.max(1, Math.ceil(items.length / RECENT_PAGE_SIZE));
  const start = (page - 1) * RECENT_PAGE_SIZE;
  const pageItems = items.slice(start, start + RECENT_PAGE_SIZE);
  const canPrev = page > 1;
  const canNext = page < totalPages;

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Recent failures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-slate-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm text-amber-800">Failed to load recent failures.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-base">Recent failures (Redis)</CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>Show</span>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value) as (typeof RECENT_LIMIT_OPTIONS)[number]);
              setPage(1);
            }}
            className="rounded border border-slate-200 bg-white px-2 py-1 font-mono"
            aria-label="Items to fetch"
          >
            {RECENT_LIMIT_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span>· page {page} of {totalPages}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No recent failures.</p>
        ) : (
          <>
            <ul className={`space-y-3 ${LIST_MAX_H} overflow-y-auto pr-1`}>
              {pageItems.map((item, i) => (
                <li
                  key={`${item.at}-${start + i}`}
                  className="border-b border-slate-100 pb-2 last:border-0"
                >
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.at).toLocaleString()}
                  </p>
                  <p className="font-mono text-xs text-amber-700">{item.code}</p>
                  <p className="text-sm text-slate-600 line-clamp-2">{item.error}</p>
                </li>
              ))}
            </ul>
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={!canPrev}
                  aria-label="Previous page"
                >
                  <ChevronLeft className="size-4" />
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!canNext}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

const LIMIT = 20;
const MAX_PAGE = 100;

function FailedValidationsTable() {
  const [page, setPage] = useState(1);
  const [codeFilter, setCodeFilter] = useState("");
  const { data, isLoading, error } = useGetFailedValidationsQuery({
    page,
    limit: LIMIT,
    code: codeFilter.trim() || undefined,
  });

  if (isLoading) {
    return (
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-base">Failed validations (DB)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 animate-pulse rounded bg-slate-100" />
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="py-6">
          <p className="text-sm text-amber-800">Failed to load list.</p>
        </CardContent>
      </Card>
    );
  }

  const { items, meta } = data;
  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));
  const canPrev = page > 1;
  const canNext = page < totalPages && page < MAX_PAGE;

  return (
    <Card className="bg-white">
      <CardHeader>
        <CardTitle className="text-base">Failed validations (DB)</CardTitle>
        <p className="text-xs text-muted-foreground">
          Page {meta.page} of {totalPages}, {meta.total} total
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="text-sm text-muted-foreground" htmlFor="validation-code-filter">
            Filter by code
          </label>
          <Input
            id="validation-code-filter"
            placeholder="e.g. PRICE_OUT_OF_TOLERANCE"
            value={codeFilter}
            onChange={(e) => {
              setCodeFilter(e.target.value);
              setPage(1);
            }}
            className="max-w-[240px] font-mono text-sm"
            aria-label="Filter by error code"
          />
          {(codeFilter.trim() || page > 1) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCodeFilter("");
                setPage(1);
              }}
            >
              Clear
            </Button>
          )}
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No failed validations.</p>
        ) : (
          <>
            <div className={`overflow-auto ${LIST_MAX_H}`}>
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 bg-white">
                  <tr className="border-b border-slate-200 text-left text-muted-foreground">
                    <th className="pb-2 pr-2">Time</th>
                    <th className="pb-2 pr-2">Code</th>
                    <th className="pb-2 pr-2">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="py-2 pr-2 text-xs text-muted-foreground">
                        {new Date(row.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-2 font-mono text-xs">{row.code}</td>
                      <td className="py-2 pr-2 max-w-[320px] truncate">{row.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!canPrev}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {meta.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => p + 1)}
                disabled={!canNext}
                aria-label="Next page"
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function ValidationFailedClient() {
  return (
    <div className="space-y-8">
      <section>
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">Summary</h3>
        <ReportKpis days={7} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <ByCodeChart days={7} />
        <RecentFailedList />
      </div>

      <section>
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">Daily trend</h3>
        <DailyChart days={7} />
      </section>

      <section>
        <h3 className="mb-4 text-sm font-medium text-muted-foreground">Full list</h3>
        <FailedValidationsTable />
      </section>
    </div>
  );
}

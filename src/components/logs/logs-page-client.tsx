"use client";

import * as React from "react";
import { RefreshCcw, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

/** Core GET /api/logs entry shape. */
export interface CoreLogEntry {
  id: string;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  body: unknown;
  timestamp: string;
  statusCode?: number;
  responseTimeMs?: number;
}

interface LogsMeta {
  page: number;
  limit: number;
  total: number;
}

function methodColor(method: string): string {
  switch (method) {
    case "GET":
      return "bg-emerald-100 text-emerald-800";
    case "POST":
      return "bg-blue-100 text-blue-800";
    case "PUT":
    case "PATCH":
      return "bg-amber-100 text-amber-800";
    case "DELETE":
      return "bg-red-100 text-red-800";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusColor(status: number): string {
  if (status >= 200 && status < 300) return "bg-emerald-100 text-emerald-800";
  if (status >= 300 && status < 400) return "bg-blue-100 text-blue-800";
  if (status >= 400 && status < 500) return "bg-amber-100 text-amber-800";
  if (status >= 500) return "bg-red-100 text-red-800";
  return "bg-slate-100 text-slate-600";
}

function formatTime(ts: string | number): string {
  const d = typeof ts === "string" ? new Date(ts) : new Date(ts);
  return d.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function LogsPageClient() {
  const [logs, setLogs] = React.useState<CoreLogEntry[]>([]);
  const [meta, setMeta] = React.useState<LogsMeta>({ page: 1, limit: 50, total: 0 });
  const [selected, setSelected] = React.useState<CoreLogEntry | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [methodFilter, setMethodFilter] = React.useState<string>("all");
  const [pathFilter, setPathFilter] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sinceFilter, setSinceFilter] = React.useState("");
  const [page, setPage] = React.useState(1);
  const limit = 50;

  const fetchLogs = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (pathFilter.trim()) params.set("path", pathFilter.trim());
      if (sinceFilter.trim()) params.set("since", new Date(sinceFilter).toISOString());
      params.set("page", String(page));
      params.set("limit", String(limit));
      const res = await fetch(`/api/logs?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLogs(json.data);
        setMeta(json.meta ?? { page: 1, limit: 50, total: json.data.length });
      }
    } finally {
      setLoading(false);
    }
  }, [methodFilter, pathFilter, sinceFilter, page]);

  React.useEffect(() => {
    if (selected && !logs.some((e) => e.id === selected.id)) {
      setSelected(null);
    }
  }, [logs, selected]);

  React.useEffect(() => {
    setPage(1);
  }, [methodFilter, pathFilter, sinceFilter]);

  React.useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  React.useEffect(() => {
    const onFocus = () => fetchLogs();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchLogs]);

  const filteredByStatus =
    statusFilter === "all"
      ? logs
      : logs.filter((e) => String(e.statusCode ?? "") === statusFilter);

  const bodyStr =
    selected?.body != null
      ? typeof selected.body === "string"
        ? selected.body
        : JSON.stringify(selected.body, null, 2)
      : null;
  const queryStr =
    selected && Object.keys(selected.query).length > 0
      ? JSON.stringify(selected.query, null, 2)
      : null;
  const headersStr =
    selected && Object.keys(selected.headers).length > 0
      ? JSON.stringify(selected.headers, null, 2)
      : null;

  const totalPages = Math.max(1, Math.ceil(meta.total / meta.limit));

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 font-primary text-body">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-display font-semibold tracking-tight">Logs</h1>
          <p className="font-secondary text-caption text-muted-foreground">
            Request logs. Filter and paginate.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={methodFilter} onValueChange={(v) => { setMethodFilter(v); setPage(1); }}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Method" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All methods</SelectItem>
              <SelectItem value="GET">GET</SelectItem>
              <SelectItem value="POST">POST</SelectItem>
              <SelectItem value="PUT">PUT</SelectItem>
              <SelectItem value="PATCH">PATCH</SelectItem>
              <SelectItem value="DELETE">DELETE</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Filter path..."
            value={pathFilter}
            onChange={(e) => setPathFilter(e.target.value)}
            className="w-[180px]"
          />
          <Input
            type="datetime-local"
            placeholder="Since"
            value={sinceFilter}
            onChange={(e) => { setSinceFilter(e.target.value); setPage(1); }}
            className="w-[180px]"
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[110px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All status</SelectItem>
              <SelectItem value="200">200</SelectItem>
              <SelectItem value="201">201</SelectItem>
              <SelectItem value="400">400</SelectItem>
              <SelectItem value="404">404</SelectItem>
              <SelectItem value="500">500</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
            <RefreshCcw className="size-4" aria-hidden />
            Refresh
          </Button>
        </div>
      </div>

      <div className="flex flex-row gap-4">
        <Card className="flex flex-col overflow-hidden bg-white w-2/3">
          <CardHeader className="border-b py-3 flex flex-row items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Requests</p>
            <span className="text-xs text-slate-400">
              {meta.total} total · page {meta.page}
            </span>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-slate-500">
                Loading…
              </div>
            ) : filteredByStatus.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <p className="text-sm font-medium text-slate-500">No requests</p>
                <p className="text-xs text-slate-400">
                  Adjust filters or refresh. Data from Core GET /api/logs.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {filteredByStatus.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(entry)}
                      className={`flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-slate-50 ${selected?.id === entry.id ? "bg-slate-100" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <Badge className={methodColor(entry.method)} variant="secondary">
                          {entry.method}
                        </Badge>
                        {entry.statusCode != null && entry.statusCode > 0 && (
                          <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor(entry.statusCode)}`}>
                            {entry.statusCode}
                          </span>
                        )}
                        {entry.responseTimeMs != null && (
                          <span className="text-xs text-slate-400">{entry.responseTimeMs}ms</span>
                        )}
                        <span className="ml-auto text-xs text-slate-400">
                          {formatTime(entry.timestamp)}
                        </span>
                      </div>
                      <span className="truncate font-mono text-xs text-slate-700">
                        {entry.path}
                        {Object.keys(entry.query).length > 0 ? "?" + new URLSearchParams(entry.query).toString() : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs text-slate-500">
                Page {meta.page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages || loading}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </Card>

        <Card className="flex flex-col overflow-hidden bg-white w-full">
          <CardHeader className="border-b py-3">
            <p className="text-sm font-medium text-slate-600">
              {selected ? `${selected.method} ${selected.path}` : "Select a request"}
            </p>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-4">
            {!selected ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-sm text-slate-500">Select a request from the list to view details.</p>
              </div>
            ) : (
              <div className="space-y-6 font-tertiary text-table">
                <div className="flex flex-wrap gap-4">
                  {selected.statusCode != null && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</h3>
                      <p className="font-mono text-sm">{selected.statusCode}</p>
                    </div>
                  )}
                  {selected.responseTimeMs != null && (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Response time</h3>
                      <p className="font-mono text-sm">{selected.responseTimeMs} ms</p>
                    </div>
                  )}
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Time</h3>
                    <p className="font-mono text-sm">{selected.timestamp}</p>
                  </div>
                </div>
                {headersStr && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Headers</h3>
                    <pre className="max-h-48 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                      {headersStr}
                    </pre>
                  </div>
                )}
                {queryStr && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Query</h3>
                    <pre className="max-h-32 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs">
                      {queryStr}
                    </pre>
                  </div>
                )}
                {(bodyStr !== null && bodyStr !== undefined) && (
                  <div>
                    <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Body</h3>
                    <pre className="max-h-64 overflow-auto rounded-md border border-slate-200 bg-slate-50 p-3 text-xs whitespace-pre-wrap break-words">
                      {bodyStr}
                    </pre>
                  </div>
                )}
                {selected.body == null && ["POST", "PUT", "PATCH"].includes(selected.method) && (
                  <p className="text-xs text-slate-400">No body captured (or empty).</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

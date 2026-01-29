"use client";

import { useState } from "react";
import { Copy, Check, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { ApiKeyRow } from "@/lib/data-stripe-dashboard";

function EmptyApiKeysState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
        <span className="text-lg text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <p className="text-sm font-medium text-slate-600">No API keys</p>
      <p className="text-xs text-slate-500">
        API keys will appear here when configured.
      </p>
    </div>
  );
}

export function ApiKeysCard({ rows }: { rows: ApiKeyRow[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (index: number, value: string) => {
    void navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const hasData = rows.length > 0;

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <h3 className="text-base font-medium text-slate-900">API keys</h3>
        <a
          href="https://docs.example.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          View docs
          <ExternalLink className="size-3.5" />
        </a>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasData ? (
          rows.map((row, index) => (
            <div
              key={row.label}
              className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-500">{row.label}</p>
                <p className="truncate font-mono text-sm text-slate-900">
                  {row.value}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-slate-500 hover:text-slate-700"
                onClick={() => handleCopy(index, row.value)}
                aria-label={`Copy ${row.label}`}
              >
                {copiedIndex === index ? (
                  <Check className="size-4 text-green-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          ))
        ) : (
          <EmptyApiKeysState />
        )}
      </CardContent>
    </Card>
  );
}

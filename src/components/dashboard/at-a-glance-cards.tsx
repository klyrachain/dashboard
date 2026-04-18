"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { AtAGlanceCard } from "@/lib/data-stripe-dashboard";

function EmptyGlanceState() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-slate-100">
        <span className="text-lg text-slate-400" aria-hidden>
          —
        </span>
      </div>
      <p className="text-sm font-medium text-slate-600">No data</p>
      <p className="text-xs text-slate-500">
        At a glance metrics will appear here.
      </p>
    </div>
  );
}

export function AtAGlanceCards({
  cards,
  isUpdatingRates = false,
}: {
  cards: AtAGlanceCard[];
  /** When true, show a subtle "Updating…" under values; values stay visible and update in place. */
  isUpdatingRates?: boolean;
}) {
  const hasData = cards.length > 0;

  if (!hasData) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-white">
          <CardContent className="pt-6">
            <EmptyGlanceState />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="bg-white">
          <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-slate-500">{card.title}</p>
            {card.action && (
              <Link
                href={card.action.href}
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {card.action.label}
              </Link>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-slate-900">
              {card.value}
            </p>
            {isUpdatingRates && card.title === "Total balance" ? (
              <p className="text-xs text-slate-400" aria-live="polite">
                Updating…
              </p>
            ) : null}
            {card.sub && (
              <p className="text-xs text-slate-500">{card.sub}</p>
            )}
            {card.trend && (
              <Badge
                variant={card.trend.positive ? "success" : "secondary"}
                className="mt-1"
              >
                {card.trend.value}
              </Badge>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

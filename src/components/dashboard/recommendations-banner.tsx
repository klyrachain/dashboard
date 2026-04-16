"use client";

import { useState } from "react";
import { X, Lightbulb, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/data-stripe-dashboard";

export function RecommendationsBanner({
  recommendations,
}: {
  recommendations: Recommendation[];
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const visible = recommendations.filter((r) => !dismissed.has(r.id));

  if (visible.length === 0) return null;

  const item = visible[0];
  const Icon = item.icon === "sparkles" ? Sparkles : Lightbulb;

  return (
    <Card className="relative bg-white">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 pr-10">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-amber-100 text-amber-700">
            <Icon className="size-4" />
          </div>
          <h3 className="text-base font-medium text-slate-900">{item.title}</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-2 top-2 size-8 text-slate-400 hover:text-slate-600"
          onClick={() => setDismissed((s) => new Set(s).add(item.id))}
          aria-label="Dismiss"
        >
          <X className="size-4" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-sm text-slate-600">{item.description}</p>
        <Button size="sm" className="mt-3" variant="secondary">
          {item.buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

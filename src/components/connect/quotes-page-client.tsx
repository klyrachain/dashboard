"use client";

import { useState, useEffect, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { getQuotesAction } from "@/app/connect/quotes/actions";
import { QuoteCard } from "./quote-card";
import type { TokenPair, QuoteResult } from "@/lib/data-quotes";
import { Button } from "@/components/ui/button";

type QuotesPageClientProps = {
  pairs: TokenPair[];
};

export function QuotesPageClient({ pairs }: QuotesPageClientProps) {
  const [order, setOrder] = useState<string[]>(() =>
    pairs.map((p) => p.label)
  );
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);

  const orderedPairs = useMemo(() => {
    const byLabel = new Map(pairs.map((p) => [p.label, p]));
    return order
      .map((label) => byLabel.get(label))
      .filter((p): p is TokenPair => p != null);
  }, [pairs, order]);

  const resultsByLabel = useMemo(() => {
    const m = new Map<string, QuoteResult>();
    for (const r of results) m.set(r.pair.label, r);
    return m;
  }, [results]);

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const data = await getQuotesAction(pairs);
      setResults(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (pairs.length > 0) fetchQuotes();
  }, [pairs.length]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setOrder((prev) => {
        const oldIndex = prev.indexOf(String(active.id));
        const newIndex = prev.indexOf(String(over.id));
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  if (pairs.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-8 text-center font-secondary text-caption text-slate-600">
        No token pairs from transactions. Ensure Core API is running and transactions exist.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchQuotes}
          disabled={loading}
        >
          {loading ? "Loading…" : "Refresh quotes"}
        </Button>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={order}
          strategy={rectSortingStrategy}
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {orderedPairs.map((pair) => {
              const result = resultsByLabel.get(pair.label) ?? {
                pair,
                ok: false,
                error: loading ? "Loading…" : "No quote",
              };
              return (
                <QuoteCard
                  key={pair.label}
                  id={pair.label}
                  result={result}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

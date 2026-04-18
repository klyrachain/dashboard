"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
import type { TokenPair, QuoteResult, SwapQuoteProvider } from "@/lib/data-quotes";
import { Button } from "@/components/ui/button";
import { quotesEmpty } from "@/lib/user-feedback-copy";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVIDER_OPTIONS: { value: SwapQuoteProvider; label: string }[] = [
  { value: "best", label: "Best rate" },
  { value: "squid", label: "Squid" },
  { value: "0x", label: "0x" },
  { value: "lifi", label: "LiFi" },
];

type QuotesPageClientProps = {
  pairs: TokenPair[];
};

export function QuotesPageClient({ pairs }: QuotesPageClientProps) {
  const pairsRef = useRef(pairs);
  pairsRef.current = pairs;

  const [order, setOrder] = useState<string[]>(() =>
    pairs.map((p) => p.label)
  );
  const [results, setResults] = useState<QuoteResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [provider, setProvider] = useState<SwapQuoteProvider>("squid");

  const pairSignature = useMemo(
    () =>
      pairs
        .map(
          (p) =>
            `${p.label}:${p.fromChainId}:${p.toChainId}:${p.fromToken}:${p.toToken}`
        )
        .join("|"),
    [pairs]
  );

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

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getQuotesAction(pairsRef.current, provider);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    if (pairs.length > 0) void fetchQuotes();
  }, [pairs.length, pairSignature, provider, fetchQuotes]);

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
        {quotesEmpty}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={provider}
          onValueChange={(v) => setProvider(v as SwapQuoteProvider)}
          disabled={loading}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Provider" />
          </SelectTrigger>
          <SelectContent>
            {PROVIDER_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 p-2">
            {orderedPairs.map((pair) => {
              const result = resultsByLabel.get(pair.label) ?? {
                pair,
                ok: false,
                error: loading ? "Loading…" : undefined,
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

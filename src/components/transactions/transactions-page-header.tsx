"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check } from "lucide-react";

export type TransactionsView = "fulfilled" | "unfulfilled";

const VIEW_OPTIONS: { value: TransactionsView; label: string }[] = [
  { value: "fulfilled", label: "Fulfilled" },
  { value: "unfulfilled", label: "Unfulfilled" },
];

type TransactionsPageHeaderProps = {
  /** Current view from URL (fulfilled | unfulfilled). */
  currentView: TransactionsView;
};

export function TransactionsPageHeader({ currentView }: TransactionsPageHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleSelect = (value: TransactionsView) => {
    const next = new URLSearchParams(searchParams.toString());
    if (value === "fulfilled") {
      next.delete("view");
      next.delete("page");
    } else {
      next.set("view", value);
      next.set("page", "1");
    }
    const q = next.toString();
    router.push(q ? `/transactions?${q}` : "/transactions");
  };

  const currentLabel = VIEW_OPTIONS.find((o) => o.value === currentView)?.label ?? "Fulfilled";

  return (
    <div className="flex flex-wrap items-center gap-3">
      <h1 className="text-display font-semibold tracking-tight">
        Transactions
      </h1>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 min-w-[140px]">
            {currentLabel}
            <ChevronDown className="size-4" aria-hidden />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[180px] p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleSelect(opt.value)}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-slate-100 focus:bg-slate-100"
            >
              {currentView === opt.value ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : (
                <span className="size-4" aria-hidden />
              )}
              {opt.label}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

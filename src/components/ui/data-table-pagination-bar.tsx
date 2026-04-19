"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_PRESETS = [10, 25, 50, 100] as const;

export type DataTablePaginationBarProps = {
  /** 1-based page index */
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  presets?: readonly number[];
  className?: string;
};

export function DataTablePaginationBar({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  presets = DEFAULT_PRESETS,
  className,
}: DataTablePaginationBarProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const [pageSizeInput, setPageSizeInput] = useState(String(pageSize));

  useEffect(() => {
    setPageSizeInput(String(pageSize));
  }, [pageSize]);

  const applyCustomPageSize = useCallback(() => {
    const n = parseInt(pageSizeInput.trim(), 10);
    if (Number.isFinite(n) && n >= 1 && n <= 200) {
      onPageSizeChange(n);
    } else {
      setPageSizeInput(String(pageSize));
    }
  }, [pageSizeInput, pageSize, onPageSizeChange]);

  const handlePreset = useCallback(
    (value: string) => {
      if (value === "custom") return;
      const n = parseInt(value, 10);
      if (Number.isFinite(n)) onPageSizeChange(n);
    },
    [onPageSizeChange]
  );

  const presetValue = presets.includes(pageSize as (typeof presets)[number])
    ? String(pageSize)
    : "custom";

  return (
    <nav
      className={className}
      aria-label="Table pagination"
    >
      <div className="flex flex-col gap-4 border-t border-border p-3 sm:p-4 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-6 md:gap-y-4">
        <div className="flex min-w-0 flex-col gap-2 sm:max-w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3 sm:gap-y-2">
          <span className="shrink-0 text-sm font-medium text-muted-foreground whitespace-nowrap">
            Rows per page
          </span>
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <Select value={presetValue} onValueChange={handlePreset}>
              <SelectTrigger className="h-9 w-[90px] shrink-0" aria-label="Rows per page preset">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {presets.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}
                  </SelectItem>
                ))}
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
           
          </div>
        </div>
        <div className="flex min-w-0 flex-row items-center justify-between gap-4">
          <p className="flex text-sm text-muted-foreground tabular-nums w-fit">
            <span className="whitespace-nowrap">Page {safePage} of {totalPages}</span>
            {total > 0 ? (
              <span className="mt-0.5 block text-xs sm:ml-2 sm:mt-0 sm:inline">
                ({total} total)
              </span>
            ) : null}
          </p>
          <div className="flex gap-2 sm:w-auto sm:shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 sm:flex-initial"
              onClick={() => onPageChange(safePage - 1)}
              disabled={safePage <= 1}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-w-0 flex-1 sm:flex-initial"
              onClick={() => onPageChange(safePage + 1)}
              disabled={safePage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}

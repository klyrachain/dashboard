"use client";

import { formatDistanceToNow } from "date-fns";
import { useEffect, useState } from "react";

type RelativeTimeProps = {
  /** ISO date string or Date (e.g. from server). */
  date: Date | string;
  /** Optional prefix, e.g. "Updated ". */
  prefix?: string;
  className?: string;
};

const ONE_MINUTE_MS = 60_000;

/**
 * Renders relative time (e.g. "5 minutes ago") and re-renders every minute
 * so the label stays accurate without full page refresh.
 */
export function RelativeTime({ date, prefix = "", className }: RelativeTimeProps) {
  const resolved = typeof date === "string" ? new Date(date) : date;
  const resolvedMs = resolved.getTime();
  const [label, setLabel] = useState(() =>
    formatDistanceToNow(resolved, { addSuffix: true })
  );

  useEffect(() => {
    const anchor = new Date(resolvedMs);
    const update = () =>
      setLabel(formatDistanceToNow(anchor, { addSuffix: true }));
    update();
    const id = setInterval(update, ONE_MINUTE_MS);
    return () => clearInterval(id);
  }, [resolvedMs]);

  return (
    <span className={className}>
      {prefix}
      {label}
    </span>
  );
}

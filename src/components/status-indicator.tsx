"use client";

import { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "@/store";
import { clearStatus } from "@/store/status-indicator-slice";
import { Loader2, Check, AlertCircle } from "lucide-react";

const AUTO_DISMISS_SAVED_MS = 2500;
const AUTO_DISMISS_ERROR_MS = 3000;

const positionClasses = {
  "bottom-right": "bottom-4 right-4",
  "bottom-left": "bottom-4 left-4",
  "top-right": "top-4 right-4",
  "top-left": "top-4 left-4",
} as const;

export function StatusIndicator() {
  const dispatch = useDispatch();
  const { message, type, position } = useSelector(
    (state: RootState) => state.statusIndicator
  );

  useEffect(() => {
    if (!message || type === "saving") return;
    const ms =
      type === "saved" ? AUTO_DISMISS_SAVED_MS : AUTO_DISMISS_ERROR_MS;
    const t = setTimeout(() => dispatch(clearStatus()), ms);
    return () => clearTimeout(t);
  }, [message, type, dispatch]);

  if (!message) return null;

  const positionClass = positionClasses[position];
  const isSaving = type === "saving";
  const isSaved = type === "saved";
  const isError = type === "error";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic
      className={`fixed z-[230] flex items-center gap-2 rounded-full border bg-black text-white text-xs px-4 py-2.5 shadow-sm  ${positionClass}
          `}
    >
      {isSaving && (
        <Loader2
          className="size-4 shrink-0 animate-spin"
          aria-hidden
        />
      )}
      {isSaved && <Check className="size-4 shrink-0" aria-hidden />}
      {isError && <AlertCircle className="size-4 shrink-0" aria-hidden />}
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
}

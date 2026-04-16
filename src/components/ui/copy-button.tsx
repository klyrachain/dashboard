"use client";

import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export type CopyButtonProps = {
  /** Full value to copy to clipboard (e.g. full ID, email, address). */
  value: string;
  /** Accessible label for the button (e.g. "Copy ID", "Copy email"). */
  label?: string;
  /** Hide button when value is empty. */
  hideWhenEmpty?: boolean;
  size?: "icon" | "sm" | "default" | "lg";
  variant?: "ghost" | "outline" | "link" | "default" | "secondary" | "destructive";
  className?: string;
};

/**
 * Reusable copy button for sensitive data (IDs, emails, addresses, identifiers).
 * Copies full value to clipboard and shows a check icon for 2s on success.
 */
export function CopyButton({
  value,
  label = "Copy",
  hideWhenEmpty = false,
  size = "icon",
  variant = "ghost",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(() => {
    if (value == null || value === "") return;
    void navigator.clipboard.writeText(value);
    setCopied(true);
    const t = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(t);
  }, [value]);

  if (hideWhenEmpty && (value == null || value === "")) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`shrink-0 text-muted-foreground hover:text-foreground ${className ?? ""}`}
      onClick={handleCopy}
      aria-label={label}
      disabled={value == null || value === ""}
    >
      {copied ? (
        <Check className="size-4 text-green-600" aria-hidden />
      ) : (
        <Copy className="size-4" aria-hidden />
      )}
    </Button>
  );
}

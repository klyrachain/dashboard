"use client";

/**
 * Minimal typeform-style layout: one question per view, centered, no card clutter.
 */
export function AuthTypeformLayout({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16 ${className}`}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

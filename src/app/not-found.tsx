import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-(--platform-primary) px-4 py-12 font-primary text-foreground"
      role="main"
      aria-label="Page not found"
    >
      <section
        className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 text-center shadow-xl backdrop-blur-sm"
        aria-labelledby="not-found-heading"
      >
        <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Error</p>
        <h1
          id="not-found-heading"
          className="mt-2 text-5xl font-bold tabular-nums tracking-tight text-card-foreground sm:text-6xl"
        >
          404
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          This page doesn&apos;t exist or was moved.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/" className="inline-flex items-center gap-1.5">
              <ChevronLeft className="size-4 shrink-0" aria-hidden />
              Back to dashboard
            </Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function BalancesSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-[140px] shrink-0" />
      </div>

      {/* Section A: Liquidity by Chain */}
      <section>
        <Skeleton className="mb-4 h-4 w-36" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-8 rounded-md" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="size-2 shrink-0 rounded-full" />
              </CardHeader>
              <CardContent className="space-y-3 pb-4">
                <Skeleton className="h-[140px] w-full rounded-md" />
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-12" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                </div>
              </CardContent>
              <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Section B: Asset Aggregation */}
      <section>
        <Skeleton className="mb-4 h-4 w-36" />
        <Card className="bg-white">
          <CardContent className="px-6 py-4">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 border-b border-slate-100 py-4 last:border-b-0"
                >
                  <div className="flex items-baseline justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-7 w-28" />
                  </div>
                  <div className="flex gap-1.5">
                    <Skeleton className="h-5 w-20 rounded-full" />
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Section C: In-Flight & Claimable */}
      <section>
        <Skeleton className="mb-4 h-4 w-40" />
        <div className="grid gap-4 md:grid-cols-2">
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="mt-2 h-8 w-32" />
              <Skeleton className="mt-1 h-3 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-28" />
            </CardContent>
          </Card>
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="mt-2 h-8 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 w-16" />
                </div>
              </div>
              <Skeleton className="h-9 w-full rounded-md" />
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Section D: Recent activity */}
      <section>
        <Skeleton className="mb-4 h-4 w-28" />
        <div className="mb-4 flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-32" />
        </div>
        <Card className="bg-white">
          <div className="overflow-hidden">
            <div className="flex border-b border-slate-100 px-6 py-3">
              <Skeleton className="h-4 w-12" />
              <Skeleton className="ml-6 h-4 w-12" />
              <Skeleton className="ml-6 h-4 w-12" />
              <Skeleton className="ml-6 h-4 w-20" />
              <Skeleton className="ml-6 h-4 w-14" />
              <Skeleton className="ml-6 h-4 w-24" />
            </div>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center border-b border-slate-50 px-6 py-4 last:border-b-0"
              >
                <Skeleton className="h-4 w-16" />
                <Skeleton className="ml-6 h-4 w-16" />
                <Skeleton className="ml-6 h-5 w-14 rounded-full" />
                <Skeleton className="ml-6 h-4 w-32" />
                <Skeleton className="ml-6 h-3 w-20" />
                <Skeleton className="ml-6 h-3 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <div className="flex flex-wrap items-center gap-3">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-[130px]" />
            <Skeleton className="h-8 w-[100px]" />
            <Skeleton className="h-8 w-44" />
          </div>
        </div>
      </div>

      {/* Hero volume cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-2 h-9 w-32" />
            <Skeleton className="mt-1 h-3 w-36" />
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-[140px] w-full rounded-md" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2 h-9 w-32" />
            <Skeleton className="mt-1 h-3 w-36" />
          </CardHeader>
          <CardContent className="pt-0">
            <Skeleton className="h-[140px] w-full rounded-md" />
            <div className="mt-3 flex gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-36" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* At a glance */}
      <section>
        <Skeleton className="mb-4 h-4 w-24" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-white">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24" />
                <Skeleton className="mt-1 h-3 w-32" />
                <Skeleton className="mt-2 h-5 w-14 rounded-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="space-y-8">
          {/* Inventory chart */}
          <Card className="bg-white">
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-9 w-[220px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[320px] w-full rounded-md" />
            </CardContent>
          </Card>

          {/* Recent activity card */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-4 rounded" />
                <Skeleton className="h-5 w-28" />
              </div>
              <Skeleton className="h-5 w-32 rounded-full" />
            </CardHeader>
            <CardContent>
              <div className="flex justify-end">
                <Skeleton className="mb-4 h-9 w-[160px]" />
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-md bg-slate-50 px-4 py-3"
                  >
                    <div className="flex gap-4">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-24" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* API keys */}
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-4 w-20" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-md bg-slate-50 px-3 py-2"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <Skeleton className="h-3 w-16" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="size-8 shrink-0 rounded-md" />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="bg-white">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Skeleton className="size-8 rounded-md" />
                <Skeleton className="h-5 w-40" />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-3/4" />
              <Skeleton className="mt-3 h-9 w-24 rounded-md" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

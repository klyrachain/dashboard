import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { checkCoreHealth, checkCoreReady, getCoreBaseUrl } from "@/lib/core-api";

export async function CoreStatusCard() {
  const [health, ready] = await Promise.all([
    checkCoreHealth(),
    checkCoreReady(),
  ]);
  const baseUrl = getCoreBaseUrl();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Core service</CardTitle>
        <CardDescription>
          Health and readiness of the Core backend (webhook + Redis). Used for
          order processing and realtime updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">Base URL</span>
          <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
            {baseUrl}
          </code>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Liveness</span>
            <Badge variant={health.ok ? "success" : "destructive"}>
              {health.ok ? "OK" : "Unavailable"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Readiness</span>
            <Badge variant={ready.ok ? "success" : "destructive"}>
              {ready.ok ? "Ready" : "Not ready"}
            </Badge>
          </div>
        </div>
        {(!health.ok || !ready.ok) && (
          <p className="text-sm text-muted-foreground">
            {health.error ?? ready.error}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

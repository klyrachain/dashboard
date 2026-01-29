import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type HealthStatus = "healthy" | "degraded" | "down";

export function Topbar({ className }: { className?: string }) {
  // Mocked for now per requirements
  const systemHealth: HealthStatus = "healthy";

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-6",
        className
      )}
    >
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">System Health</span>
        <Badge
          variant={
            systemHealth === "healthy"
              ? "success"
              : systemHealth === "degraded"
                ? "warning"
                : "destructive"
          }
        >
          {systemHealth === "healthy"
            ? "Operational"
            : systemHealth === "degraded"
              ? "Degraded"
              : "Down"}
        </Badge>
      </div>
    </header>
  );
}

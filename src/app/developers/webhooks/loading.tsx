import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function MerchantWebhooksLoading() {
  return (
    <div className="space-y-8">
      <div className="h-16 w-64 animate-pulse rounded bg-muted" />
      <Card>
        <CardHeader>
          <div className="h-6 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
          <div className="h-10 w-full animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

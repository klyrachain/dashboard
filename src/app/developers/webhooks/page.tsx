import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MerchantWebhooksPanel } from "@/components/developers/merchant-webhooks-panel";
import { getAccessContext, isMerchantPortalSessionReady } from "@/lib/data-access";
import { getApiDocsUrl } from "@/lib/data-developers";

export default async function MerchantWebhooksPage() {
  const access = await getAccessContext();
  const merchantPortalCookies = await isMerchantPortalSessionReady();
  const docsUrl = getApiDocsUrl();

  if (merchantPortalCookies || (access.ok && access.context?.type === "merchant")) {
    return (
      <div className="space-y-8 font-primary text-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-border pb-4">
          <header className="min-w-0 space-y-1">
            <h3 className="text-display font-semibold tracking-tight text-foreground">Webhooks</h3>
            <p className="max-w-prose font-secondary text-caption text-muted-foreground">
              Configure endpoints to receive real-time event notifications.
            </p>
          </header>
          <Button variant="default" size="sm" asChild className="shrink-0">
            <Link
              href={docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2"
            >
              Docs
              <ExternalLink className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>
        <MerchantWebhooksPanel />
      </div>
    );
  }

  return (
    <div className="space-y-4 font-primary text-body">
      <h1 className="text-display font-semibold tracking-tight text-foreground">Webhooks</h1>
      <p className="max-w-prose font-secondary text-caption text-muted-foreground">
        Webhook destinations are managed in the merchant portal. Sign in with a business workspace to configure
        endpoints.
      </p>
    </div>
  );
}

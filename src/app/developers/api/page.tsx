import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageApiContent } from "@/components/developers/manage-api-content";
import { ManageMerchantApiContent } from "@/components/developers/manage-merchant-api-content";
import { getAccessContext } from "@/lib/data-access";
import {
  getApiBaseUrl,
  getApiDocsUrl,
  getDeveloperApiKeys,
  getKeyRotationNotice,
  rateLimitTiers,
} from "@/lib/data-developers";

export default async function ManageApiPage() {
  const access = await getAccessContext();
  const docsUrl = getApiDocsUrl();

  if (access.ok && access.context?.type === "merchant") {
    return (
      <div className="space-y-8 font-primary text-body">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <header className="min-w-0 space-y-1">
            <h1 className="text-display font-semibold tracking-tight text-foreground">API keys</h1>
            <p className="max-w-prose font-secondary text-caption text-muted-foreground">
              Create keys to connect your backend and automate payouts, products, and more.
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
        <ManageMerchantApiContent docsHref={docsUrl} />
      </div>
    );
  }

  const baseUrl = getApiBaseUrl();
  const keys = getDeveloperApiKeys();
  const rotationNotice = getKeyRotationNotice();

  return (
    <div className="space-y-8 font-primary text-body">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-display font-semibold tracking-tight text-foreground">Manage API</h1>
          <p className="font-secondary text-caption text-muted-foreground">API keys, base URL, and usage.</p>
        </div>
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

      <ManageApiContent
        baseUrl={baseUrl}
        developmentKey={keys.developmentKey}
        productionKey={keys.productionKey}
        rotationNotice={rotationNotice}
        rateLimitTiers={rateLimitTiers}
        docsHref={docsUrl}
      />
    </div>
  );
}

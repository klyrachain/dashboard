import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ManageApiContent } from "@/components/developers/manage-api-content";
import {
  getApiBaseUrl,
  getApiDocsUrl,
  getDeveloperApiKeys,
  getKeyRotationNotice,
  rateLimitTiers,
} from "@/lib/data-developers";

export default function ManageApiPage() {
  const baseUrl = getApiBaseUrl();
  const docsUrl = getApiDocsUrl();
  const keys = getDeveloperApiKeys();
  const rotationNotice = getKeyRotationNotice();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Manage API
          </h1>
          <p className="text-muted-foreground">
            API keys, base URL, and usage.
          </p>
        </div>
        <Button variant="default" size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700">
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

"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  DevelopersApiDocSections,
  KeysRateTiersIntro,
} from "@/components/developers/developers-api-page-sections";
import {
  useGetMerchantApiKeysQuery,
  useCreateMerchantApiKeyMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";

type ManageMerchantApiContentProps = {
  docsHref?: string;
};

export function ManageMerchantApiContent({
  docsHref = "#",
}: ManageMerchantApiContentProps) {
  const { effectiveBusinessId, skipMerchantApi } = useMerchantTenantScope();
  const { data: keys, isLoading, isError } = useGetMerchantApiKeysQuery(
    undefined,
    { skip: skipMerchantApi }
  );
  const [createKey, { isLoading: creating }] = useCreateMerchantApiKeyMutation();
  const [name, setName] = React.useState("Dashboard");
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [inlineError, setInlineError] = React.useState<string | null>(null);
  const baseUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/v1/merchant` : "";

  const handleCreate = async () => {
    const n = name.trim();
    setInlineError(null);
    if (!n) {
      setInlineError("Enter a name for the key.");
      return;
    }
    try {
      const res = await createKey({ name: n }).unwrap();
      if (res.rawKey) {
        setRevealed(res.rawKey);
        setName("Dashboard");
      } else {
        setInlineError("Key was not returned. Try again.");
      }
    } catch {
      setInlineError("Could not create key.");
    }
  };

  const cardSurface = "border border-border bg-card text-card-foreground shadow-sm";

  if (!effectiveBusinessId) {
    return (
      <p className="font-secondary text-caption text-muted-foreground" role="status">
        Select a business to manage API keys.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="merchant-keys-tiers"
        // className="rounded-lg text-card-foreground shadow-sm transition-colors duration-300 ease-out hover:border-border/80"
      >
        <div className="p-6" id="merchant-keys-tiers">
          <KeysRateTiersIntro variant="merchant" />
        </div>

        <div className="space-y-6 border-t border-border p-6">
          {revealed ? (
            <div
              className="space-y-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30"
              role="status"
            >
              <p className="font-semibold text-amber-900 dark:text-amber-200">New key: copy now</p>
              <div className="flex flex-wrap items-center gap-2">
                <code className="break-all rounded border border-border bg-background px-2 py-1 font-mono text-caption text-foreground">
                  {revealed}
                </code>
                <CopyButton value={revealed} label="Copy key" />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(null)}>
                Dismiss
              </Button>
            </div>
          ) : null}

          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className="text-heading text-foreground">API base URL</CardTitle>
              <p className="font-secondary text-caption text-muted-foreground">
                Call this address from your backend. Authenticate with a secret key issued below or with your signed-in
                session when the business is selected.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-2">
              <Input
                readOnly
                value={baseUrl}
                className="max-w-xl min-w-0 flex-1 font-mono text-caption"
                aria-label="Merchant API base URL"
              />
              <CopyButton value={baseUrl} label="Copy base URL" hideWhenEmpty />
            </CardContent>
          </Card>

          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className="text-heading text-foreground">Create key</CardTitle>
              <p className="font-secondary text-caption text-muted-foreground">
                For this business only. We show the full key once.
              </p>
            </CardHeader>
            <CardContent className="flex flex-wrap items-end gap-4">
              <div className="min-w-[200px] flex-1 space-y-2">
                <Label htmlFor="mk-name">Key name</Label>
                <Input
                  id="mk-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Production checkout"
                />
              </div>
              <Button type="button" onClick={() => void handleCreate()} disabled={creating}>
                {creating ? "Creating…" : "Create key"}
              </Button>
              {inlineError ? (
                <p className="w-full text-caption text-destructive" role="alert">
                  {inlineError}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className="text-heading text-foreground">Your keys</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="font-secondary text-caption text-muted-foreground">Loading…</p>
              ) : isError ? (
                <p className="text-caption text-destructive" role="alert">
                  Could not list keys.
                </p>
              ) : !keys?.length ? (
                <p className="font-secondary text-caption text-muted-foreground">No keys yet.</p>
              ) : (
                <ul className="space-y-3">
                  {keys.map((k) => (
                    <li
                      key={k.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/30 p-3"
                    >
                      <div>
                        <p className="font-medium text-foreground">{k.name}</p>
                        <p className="font-mono text-caption text-muted-foreground">{k.keyPrefix}…</p>
                        <p className="mt-1 font-secondary text-caption text-muted-foreground">
                          {k.domains?.join(", ") ?? "*"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={k.isActive ? "success" : "secondary"}>
                          {k.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      <DevelopersApiDocSections
        baseUrl={baseUrl}
        examplePath=""
        authHeaderLine="X-API-Key: YOUR_MERCHANT_SECRET_KEY"
        docsHref={docsHref}
        emptyBasePlaceholder="<YOUR_DASHBOARD_ORIGIN>/api/v1/merchant"
      />

      <p className="font-secondary text-caption text-muted-foreground">
        <a
          href={docsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          Full API reference
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      </p>
    </div>
  );
}

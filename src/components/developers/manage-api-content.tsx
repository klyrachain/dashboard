"use client";

import * as React from "react";
import { Eye, EyeOff } from "lucide-react";
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
import type { KeyRotationNotice, RateLimitTier } from "@/lib/data-developers";

type ManageApiContentProps = {
  baseUrl: string;
  developmentKey: string;
  productionKey: string;
  rotationNotice: KeyRotationNotice;
  rateLimitTiers: RateLimitTier[];
  docsHref?: string;
};

export function ManageApiContent({
  baseUrl,
  developmentKey,
  productionKey,
  rotationNotice,
  rateLimitTiers,
  docsHref = "#",
}: ManageApiContentProps) {
  const [productionRevealed, setProductionRevealed] = React.useState(false);
  const productionDisplay = productionRevealed ? productionKey : "••••••••••••••••••••";

  const cardSurface = "bg-background text-card-foreground flex-1";

  return (
    <div className="space-y-8">
      {rotationNotice ? (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/40 dark:bg-amber-950/30"
          role="alert"
        >
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Key rotation scheduled</p>
            <p className="text-caption text-amber-800 dark:text-amber-100/90">{rotationNotice.message}</p>
          </div>
          <Badge
            variant="secondary"
            className="shrink-0 bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-100"
          >
            Notice
          </Badge>
        </div>
      ) : null}
      <section
        aria-labelledby="platform-keys-tiers"
        className="rounded-lg text-card-foreground transition-colors duration-300 ease-out space-y-6"
      >
         <Card className={cardSurface}>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-heading text-foreground">Rate limits</CardTitle>
                <p className="font-secondary text-caption text-muted-foreground">Request limits per tier.</p>
              </div>
              <Badge variant="secondary" className="shrink-0">
                Usage
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                {rateLimitTiers.map((tier) => (
                  <div
                    key={tier.name}
                    className="rounded-lg border border-border bg-muted/30 px-4 py-4 text-center"
                  >
                    <p className="text-2xl font-semibold tabular-nums text-foreground">{tier.limit}</p>
                    <p className="mt-1 font-secondary text-caption text-muted-foreground">{tier.name}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        <div className="flex gap-4" id="platform-keys-tiers">
          <KeysRateTiersIntro variant="platform" />
          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className="text-heading text-foreground">Keys</CardTitle>
              <p className="font-secondary text-caption text-muted-foreground">
                Secure keys for authenticating your API requests.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="dev-key" className="font-secondary text-caption text-muted-foreground">
                  Development key
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="dev-key"
                    readOnly
                    value={developmentKey}
                    className="font-mono text-caption min-w-0 flex-1 border-none"
                    aria-label="Development key"
                  />
                  <CopyButton value={developmentKey} label="Copy development key" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="prod-key" className="font-secondary text-caption text-muted-foreground">
                  Production key
                </Label>
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    id="prod-key"
                    readOnly
                    type={productionRevealed ? "text" : "password"}
                    value={productionDisplay}
                    className="font-mono text-caption min-w-0 flex-1 border-none"
                    aria-label="Production key"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    onClick={() => setProductionRevealed((v) => !v)}
                    aria-label={productionRevealed ? "Hide production key" : "Reveal production key"}
                  >
                    {productionRevealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                  </Button>
                  <CopyButton value={productionKey} label="Copy production key" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>

        <div className="space-y-6">
          

          <Card className={cardSurface}>
            <CardHeader>
              <CardTitle className="text-heading text-foreground">Base URL</CardTitle>
              <p className="font-secondary text-caption text-muted-foreground">
                Your API endpoints are exposed through this gateway.
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <Input readOnly value={baseUrl} className="font-mono border-none text-caption min-w-0 flex-1" aria-label="Base URL" />
                <CopyButton value={baseUrl} label="Copy base URL" />
              </div>
            </CardContent>
          </Card>

       
         
        </div>
      </section>

      <DevelopersApiDocSections
        baseUrl={baseUrl}
        examplePath="/health"
        authHeaderLine="X-API-Key: YOUR_DEVELOPMENT_OR_PRODUCTION_KEY"
        docsHref={docsHref}
      />
    </div>
  );
}

"use client";

import * as React from "react";
import { ExternalLink, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
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

  return (
    <div className="space-y-8">
      {/* Key Rotation Notice */}
      {rotationNotice && (
        <div
          className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          role="alert"
        >
          <div>
            <p className="font-semibold text-amber-900">Key Rotation Scheduled</p>
            <p className="text-sm text-amber-800">
              {rotationNotice.message}
            </p>
          </div>
          <Badge variant="secondary" className="bg-amber-100 text-amber-900 shrink-0">
            Notice
          </Badge>
        </div>
      )}

      {/* Base URL */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Base URL</CardTitle>
          <p className="text-sm text-muted-foreground">
            Your API endpoints are ready through our gateway.
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              readOnly
              value={baseUrl}
              className="font-mono text-sm"
              aria-label="Base URL"
            />
            <CopyButton value={baseUrl} label="Copy base URL" />
          </div>
        </CardContent>
      </Card>

      {/* Keys */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle className="text-lg">Keys</CardTitle>
          <p className="text-sm text-muted-foreground">
            Secure keys for authenticating your API requests.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dev-key" className="text-muted-foreground">
              Development Key
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="dev-key"
                readOnly
                value={developmentKey}
                className="font-mono text-sm"
                aria-label="Development key"
              />
              <CopyButton value={developmentKey} label="Copy development key" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="prod-key" className="text-muted-foreground">
              Production Key
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="prod-key"
                readOnly
                type={productionRevealed ? "text" : "password"}
                value={productionDisplay}
                className="font-mono text-sm"
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
                {productionRevealed ? (
                  <EyeOff className="size-4" aria-hidden />
                ) : (
                  <Eye className="size-4" aria-hidden />
                )}
              </Button>
              <CopyButton value={productionKey} label="Copy production key" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-row gap-4 w-full">
        {/* Rate Limits */}
        <Card className="bg-white w-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg">Rate Limits</CardTitle>
              <p className="text-sm text-muted-foreground">
                Request limits per tier.
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              Usage
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="flex flex-row gap-4">
              {rateLimitTiers.map((tier) => (
                <div
                  key={tier.name}
                  className="rounded-lg border bg-muted/30 px-4 py-3 text-center w-full"
                >
                  <p className="text-2xl font-semibold tabular-nums">
                    {tier.limit}
                  </p>
                  <p className="text-sm text-muted-foreground">{tier.name}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Start Guide */}
        <Card className="bg-white w-full">
          <CardHeader>
            <CardTitle className="text-lg">Quick Start Guide</CardTitle>
            <p className="text-sm text-muted-foreground">
              Get started with the API in minutes.
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="mb-1 font-medium">1 Authentication</p>
              <p className="mb-2 text-sm text-muted-foreground">
                Add your key to the header.
              </p>
              <pre className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                X-API-Key: your_api_key
              </pre>
            </div>
            <div>
              <p className="mb-1 font-medium">2 Make a Request</p>
              <p className="mb-2 text-sm text-muted-foreground">
                Send your first API request.
              </p>
              <pre className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                GET /api/v1/resources
              </pre>
            </div>
            <div>
              <p className="mb-1 font-medium">3 Handle Response</p>
              <p className="mb-2 text-sm text-muted-foreground">
                Process the JSON response.
              </p>
              <pre className="rounded-md border bg-muted/50 px-3 py-2 font-mono text-sm">
                {`{ "status": "200", ... }`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

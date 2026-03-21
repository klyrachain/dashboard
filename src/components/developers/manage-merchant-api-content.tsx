"use client";

import * as React from "react";
import { ExternalLink } from "lucide-react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/ui/copy-button";
import {
  useGetMerchantApiKeysQuery,
  useCreateMerchantApiKeyMutation,
} from "@/store/merchant-api";
import type { RootState } from "@/store";

function merchantApiBaseDisplay(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/api/v1/merchant`;
}

type ManageMerchantApiContentProps = {
  docsHref?: string;
};

export function ManageMerchantApiContent({
  docsHref = "#",
}: ManageMerchantApiContentProps) {
  const activeBusinessId = useSelector(
    (s: RootState) => s.merchantSession.activeBusinessId
  );
  const { data: keys, isLoading, isError } = useGetMerchantApiKeysQuery(
    undefined,
    { skip: !activeBusinessId }
  );
  const [createKey, { isLoading: creating }] = useCreateMerchantApiKeyMutation();
  const [name, setName] = React.useState("Dashboard");
  const [revealed, setRevealed] = React.useState<string | null>(null);
  const [inlineError, setInlineError] = React.useState<string | null>(null);

  const baseUrl = merchantApiBaseDisplay();

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

  if (!activeBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business to manage API keys.
      </p>
    );
  }

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            API base URL
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Your app calls this address. Use your secret key or your signed in
            session with a business selected.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Input readOnly value={baseUrl} className="font-mono text-sm max-w-xl" aria-label="Merchant API base URL" />
          <CopyButton value={baseUrl} label="Copy base URL" />
        </CardContent>
      </Card>

      {revealed ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2"
          role="status"
        >
          <p className="font-semibold text-amber-900">New key: copy now</p>
          <div className="flex flex-wrap items-center gap-2">
            <code className="text-sm break-all bg-white px-2 py-1 rounded border">
              {revealed}
            </code>
            <CopyButton value={revealed} label="Copy key" />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setRevealed(null)}>
            Dismiss
          </Button>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Create key
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            For this business only. We show the full key once.
          </p>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-2 flex-1 min-w-[200px]">
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
            <p className="text-sm text-destructive w-full" role="alert">
              {inlineError}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Your keys
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : isError ? (
            <p className="text-sm text-destructive" role="alert">
              Could not list keys.
            </p>
          ) : !keys?.length ? (
            <p className="text-sm text-muted-foreground">No keys yet.</p>
          ) : (
            <ul className="space-y-3">
              {keys.map((k) => (
                <li
                  key={k.id}
                  className="flex flex-wrap items-center bg-muted/30 justify-between gap-2 rounded-md p-3"
                >
                  <div>
                    <p className="font-medium">{k.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {k.keyPrefix}…
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
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

      <p className="text-sm text-muted-foreground">
        <a
          href={docsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-foreground underline-offset-4 hover:underline"
        >
          API docs
          <ExternalLink className="size-4 shrink-0" aria-hidden />
        </a>
      </p>
    </div>
  );
}

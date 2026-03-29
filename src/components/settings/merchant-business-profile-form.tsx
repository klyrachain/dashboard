"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useGetMerchantBusinessQuery,
  usePatchMerchantBusinessMutation,
} from "@/store/merchant-api";
import type { RootState } from "@/store";
import { Skeleton } from "@/components/ui/skeleton";

export function MerchantBusinessProfileForm() {
  const activeBusinessId = useSelector(
    (s: RootState) => s.merchantSession.activeBusinessId
  );
  const { data, isLoading, isError } = useGetMerchantBusinessQuery(undefined, {
    skip: !activeBusinessId,
  });
  const [patch, { isLoading: saving }] = usePatchMerchantBusinessMutation();
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  useEffect(() => {
    if (!data) return;
    setName(data.name ?? "");
    setWebsite(data.website ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setSupportEmail(data.supportEmail ?? "");
    setWebhookUrl(data.webhookUrl ?? "");
  }, [data]);

  if (!activeBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to edit its profile.
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        Could not load business profile. Sign in again or check Merchant API{" "}
        <code className="text-xs">GET /business</code>.
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    try {
      await patch({
        name: name.trim() || undefined,
        website: website.trim() ? website.trim() : null,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
        supportEmail: supportEmail.trim() ? supportEmail.trim() : null,
        webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : null,
      }).unwrap();
      setFormMessage({ type: "success", text: "Business profile updated." });
    } catch {
      setFormMessage({
        type: "error",
        text: "Could not save. Check fields (URLs and email must be valid).",
      });
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Public name, logo, website, and support email. Slug:{" "}
            <span className="font-mono text-xs">{data.slug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mb-name">Name</Label>
            <Input
              id="mb-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={1}
              maxLength={200}
              autoComplete="organization"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-logo">Logo URL (optional)</Label>
            <Input
              id="mb-logo"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-web">Website (optional)</Label>
            <Input
              id="mb-web"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-email">Support email (optional)</Label>
            <Input
              id="mb-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@company.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>
            Event delivery URL for this business (Merchant API{" "}
            <code className="text-xs">PATCH /business</code>).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mb-wh">Webhook URL</Label>
            <Input
              id="mb-wh"
              type="url"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://api.yourapp.com/webhooks/morapay"
            />
          </div>
        </CardContent>
      </Card>

      {data.kybStatus ? (
        <p className="text-sm text-muted-foreground">
          KYB status: <strong>{data.kybStatus}</strong>
          {data.country ? ` · ${data.country}` : null}
        </p>
      ) : null}

      {formMessage ? (
        <p
          className={
            formMessage.type === "success"
              ? "text-sm text-green-700"
              : "text-sm text-destructive"
          }
          role="status"
        >
          {formMessage.text}
        </p>
      ) : null}

      <Button type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}

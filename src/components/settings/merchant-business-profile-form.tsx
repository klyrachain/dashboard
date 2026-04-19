"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  useGetMerchantBusinessQuery,
  usePatchMerchantBusinessMutation,
  usePostMerchantSupportEmailRequestCodeMutation,
  usePostMerchantSupportEmailVerifyMutation,
} from "@/store/merchant-api";
import { useMerchantTenantScope } from "@/hooks/use-merchant-tenant-scope";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import type { MerchantBusinessPatchBody, MerchantBusinessProfile } from "@/types/merchant-api";
import { formatKybLabel } from "@/lib/kyb-status";

export type MerchantBusinessProfileFormProps = {
  /** Optional snapshot from Core `GET /api/v1/merchant/business` (RSC) to avoid empty first paint. */
  serverProfile?: MerchantBusinessProfile | null;
};

export function MerchantBusinessProfileForm({
  serverProfile = null,
}: MerchantBusinessProfileFormProps) {
  const { effectiveBusinessId, skipMerchantApi } = useMerchantTenantScope();
  const { data, isLoading, isError } = useGetMerchantBusinessQuery(undefined, {
    skip: skipMerchantApi,
  });
  const effectiveData = data ?? serverProfile ?? null;
  const [patch, { isLoading: saving }] = usePatchMerchantBusinessMutation();
  const [requestSupportCode, { isLoading: sendingCode }] =
    usePostMerchantSupportEmailRequestCodeMutation();
  const [verifySupportCode, { isLoading: verifyingCode }] =
    usePostMerchantSupportEmailVerifyMutation();
  const [formMessage, setFormMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [website, setWebsite] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [supportOtp, setSupportOtp] = useState("");

  useEffect(() => {
    if (!effectiveData) return;
    queueMicrotask(() => {
      const legalName = (effectiveData.name ?? "").trim();
      setName(legalName || (effectiveData.slug ?? "").trim());
      setWebsite(effectiveData.website ?? "");
      setLogoUrl(effectiveData.logoUrl ?? "");
      setSupportEmail(effectiveData.supportEmail ?? "");
      setWebhookUrl(effectiveData.webhookUrl ?? "");
      setSupportOtp("");
    });
  }, [effectiveData]);

  const savedSupportNorm = useMemo(
    () => (effectiveData?.supportEmail ?? "").trim().toLowerCase(),
    [effectiveData?.supportEmail]
  );
  const draftSupportNorm = supportEmail.trim().toLowerCase();
  const supportEmailChanged =
    draftSupportNorm !== savedSupportNorm && (draftSupportNorm !== "" || savedSupportNorm !== "");

  if (!effectiveBusinessId) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Select a business in the header to edit its profile.
      </p>
    );
  }

  const showSkeleton = !skipMerchantApi && isLoading && effectiveData == null;

  if (showSkeleton) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!effectiveData) {
    if (!skipMerchantApi && isError) {
      return (
        <p className="text-sm text-destructive" role="alert">
          Could not load business profile. Sign in again or check Merchant API{" "}
          <code className="text-xs">GET /business</code>.
        </p>
      );
    }
    if (!skipMerchantApi && !isLoading) {
      return (
        <p className="text-sm text-destructive" role="alert">
          Could not load business profile. Sign in again or check Merchant API{" "}
          <code className="text-xs">GET /business</code>.
        </p>
      );
    }
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading business profile…
      </p>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMessage(null);
    try {
      const body: MerchantBusinessPatchBody = {
        name: name.trim() || undefined,
        website: website.trim() ? website.trim() : null,
        logoUrl: logoUrl.trim() ? logoUrl.trim() : null,
        webhookUrl: webhookUrl.trim() ? webhookUrl.trim() : null,
      };
      if (!supportEmailChanged) {
        body.supportEmail =
          supportEmail.trim() === "" ? null : supportEmail.trim().toLowerCase();
      } else if (draftSupportNorm === "" && savedSupportNorm !== "") {
        body.supportEmail = null;
      }
      await patch(body).unwrap();
      setFormMessage({ type: "success", text: "Business profile updated." });
    } catch (err: unknown) {
      const payload =
        err && typeof err === "object" && "data" in err
          ? ((err as { data?: { code?: string; error?: string } }).data ?? null)
          : null;
      if (payload?.code === "SUPPORT_EMAIL_VERIFICATION_REQUIRED") {
        setFormMessage({
          type: "error",
          text:
            "Changing your support email requires verification. Send a code to the new address, enter it below, then save the rest of your profile.",
        });
        return;
      }
      setFormMessage({
        type: "error",
        text:
          payload?.error?.trim() ||
          "Could not save. Check fields (URLs must be valid). If you are not an owner or admin, ask one to update business settings.",
      });
    }
  };

  const onSendSupportCode = async () => {
    setFormMessage(null);
    const email = supportEmail.trim();
    if (!email.includes("@")) {
      setFormMessage({ type: "error", text: "Enter a valid support email first." });
      return;
    }
    try {
      await requestSupportCode({ email }).unwrap();
      setFormMessage({
        type: "success",
        text: "We sent a 6-digit code to that inbox. Enter it below, then confirm.",
      });
    } catch (err: unknown) {
      const payload =
        err && typeof err === "object" && "data" in err
          ? ((err as { data?: { error?: string; code?: string } }).data ?? null)
          : null;
      setFormMessage({
        type: "error",
        text: payload?.error?.trim() || "Could not send the verification email. Try again shortly.",
      });
    }
  };

  const onVerifySupportEmail = async () => {
    setFormMessage(null);
    const email = supportEmail.trim();
    const code = supportOtp.trim();
    if (!email.includes("@") || code.length < 4) {
      setFormMessage({ type: "error", text: "Enter the support email and the code from your inbox." });
      return;
    }
    try {
      await verifySupportCode({ email, code }).unwrap();
      setSupportOtp("");
      setFormMessage({ type: "success", text: "Support email confirmed and saved." });
    } catch (err: unknown) {
      const payload =
        err && typeof err === "object" && "data" in err
          ? ((err as { data?: { error?: string } }).data ?? null)
          : null;
      setFormMessage({
        type: "error",
        text: payload?.error?.trim() || "That code did not work. Request a new code and try again.",
      });
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business</CardTitle>
          <CardDescription>
            Your company slug is {" "}
            <span className="font-mono text-xs font-bold">{effectiveData.slug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mb-name">Public business name</Label>
            <p className="text-xs text-muted-foreground">
              Shown on receipts and checkout. Defaults to your company slug until you set a name.
            </p>
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
            <Label htmlFor="mb-logo">Logo URL</Label>
            <Input
              id="mb-logo"
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-web">Website</Label>
            <Input
              id="mb-web"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mb-email">Support email</Label>
            <p className="text-xs text-muted-foreground">
              We send a one-time code to confirm any new address before it is saved on your business.
            </p>
            <Input
              id="mb-email"
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@company.com"
            />
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[140px] flex-1 space-y-1">
                <Label htmlFor="mb-email-otp" className="text-xs text-muted-foreground">
                  Verification code
                </Label>
                <Input
                  id="mb-email-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={supportOtp}
                  onChange={(e) => setSupportOtp(e.target.value)}
                  placeholder="6 digits"
                  maxLength={12}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                disabled={sendingCode}
                onClick={() => void onSendSupportCode()}
              >
                {sendingCode ? "Sending…" : "Send code"}
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={verifyingCode}
                onClick={() => void onVerifySupportEmail()}
              >
                {verifyingCode ? "Confirming…" : "Confirm email"}
              </Button>
            </div>
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

      {effectiveData.kybStatus ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm text-muted-foreground">
            KYB status: <strong>{ formatKybLabel(effectiveData.kybStatus) }</strong>
            {effectiveData.country ? ` · ${effectiveData.country}` : null}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link href="/settings/verification">Manage verification</Link>
          </Button>
        </div>
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

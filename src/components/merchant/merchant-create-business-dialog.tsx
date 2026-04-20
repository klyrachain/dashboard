"use client";

import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Loader2 } from "lucide-react";
import {
  BusinessAuthApiError,
  createPortalBusiness,
  fetchBusinessSession,
} from "@/lib/businessAuthApi";
import {
  getBusinessAccessToken,
  getStoredMerchantEnvironment,
  setBusinessAccessToken,
  setStoredActiveBusinessId,
} from "@/lib/businessAuthStorage";
import { establishMerchantPortalSession } from "@/lib/establish-merchant-portal-session";
import type { AppDispatch, RootState } from "@/store";
import { merchantApi } from "@/store/merchant-api";
import { hydrateMerchantSession } from "@/store/merchant-session-slice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type MerchantCreateBusinessDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatCreateError(err: unknown): string {
  if (err instanceof BusinessAuthApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Could not create business.";
}

export function MerchantCreateBusinessDialog({
  open,
  onOpenChange,
}: MerchantCreateBusinessDialogProps) {
  const dispatch = useDispatch<AppDispatch>();
  const portalJwt = useSelector((s: RootState) => s.merchantSession.portalJwt);
  const [companyName, setCompanyName] = useState("");
  const [website, setWebsite] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setCompanyName("");
    setWebsite("");
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const submit = async () => {
    setError(null);
    const token =
      (portalJwt?.trim() || getBusinessAccessToken()?.trim()) ?? "";
    if (!token) {
      setError("You need to be signed in to create a business.");
      return;
    }
    const name = companyName.trim();
    if (name.length < 2) {
      setError("Enter a business name (at least 2 characters).");
      return;
    }
    setSubmitting(true);
    try {
      const created = await createPortalBusiness(token, {
        companyName: name,
        website: website.trim() || undefined,
        signupRole: "FOUNDER_EXECUTIVE",
        primaryGoal: "ACCEPT_PAYMENTS",
      });
      if (!setBusinessAccessToken(created.accessToken)) {
        throw new BusinessAuthApiError("Invalid session token format.", 502, null);
      }
      const env = getStoredMerchantEnvironment() ?? "LIVE";
      await establishMerchantPortalSession(created.accessToken, {
        businessId: created.businessId,
        merchantEnvironment: env,
      });
      const session = await fetchBusinessSession(created.accessToken);
      const businesses = session.businesses;
      const activeRole =
        businesses.find((b) => b.id === created.businessId)?.role ?? null;
      dispatch(
        hydrateMerchantSession({
          sessionType: "merchant",
          portalJwt: created.accessToken,
          portalUserEmail: session.email,
          portalUserDisplayName: session.portalDisplayName,
          businesses,
          activeBusinessId: created.businessId,
          activeBusinessRole: activeRole,
          merchantEnvironment: env,
        })
      );
      setStoredActiveBusinessId(created.businessId);
      dispatch(
        merchantApi.util.invalidateTags([
          "MerchantSummary",
          "MerchantSettlements",
          "MerchantPayoutMethods",
          "MerchantBusiness",
          "MerchantTransactions",
        ])
      );
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(formatCreateError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create a new business</DialogTitle>
          <DialogDescription>
            Adds another workspace under your account. You can switch between
            businesses from this menu anytime.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-2">
            <Label htmlFor="create-biz-name">Business name</Label>
            <Input
              id="create-biz-name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Ltd"
              autoComplete="organization"
              disabled={submitting}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="create-biz-site">Website (optional)</Label>
            <Input
              id="create-biz-site"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              inputMode="url"
              disabled={submitting}
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="gap-2"
            onClick={() => void submit()}
            disabled={submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                Creating…
              </>
            ) : (
              "Create business"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

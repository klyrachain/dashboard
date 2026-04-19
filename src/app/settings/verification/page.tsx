import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAccessContext, isMerchantPortalSessionReady } from "@/lib/data-access";
import { MerchantVerificationPanel } from "@/components/settings/merchant-verification-panel";

export default async function SettingsVerificationPage() {
  const [access, merchantPortalReady] = await Promise.all([
    getAccessContext(),
    isMerchantPortalSessionReady(),
  ]);
  const isPlatform = access.ok && access.context?.type === "platform";
  const isMerchantContext = access.ok && access.context?.type === "merchant";
  /** Portal cookies mean a business session even when `/api/access` resolves as platform (e.g. key context). */
  const showMerchantVerification = isMerchantContext || merchantPortalReady;

  return (
    <div className="space-y-6 font-primary text-body">
      <header className="space-y-1">
        <h1 className="text-display font-semibold tracking-tight">Verification</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          Personal identity (KYC) for each member and company verification (KYB) for your business.
        </p>
      </header>

      {showMerchantVerification ? (
        <MerchantVerificationPanel />
      ) : (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle>KYB / KYC</CardTitle>
            <CardDescription>
              {isPlatform
                ? "Connect lists verification for support — merchants complete user KYC (every member) and KYB (founding member, on the dashboard when ready) themselves."
                : "Sign in with a business account to see your verification status."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {isPlatform ? (
                <Button asChild type="button">
                  <Link href="/connect/kyc">Open verification queue</Link>
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

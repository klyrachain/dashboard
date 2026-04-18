import { Suspense } from "react";
import { KycAdminClient } from "@/app/connect/kyc/kyc-admin-client";
import { KybBusinessAdminClient } from "@/app/connect/kyc/kyb-business-admin-client";
import { getAccessContext } from "@/lib/data-access";
import { getKybBusinessesForAdmin } from "@/lib/data-kyb-admin";
import { getPeerRampKycUsersForAdmin } from "@/lib/data-peer-ramp-kyc";

type PageProps = {
  searchParams: Promise<{ q?: string; bq?: string }>;
};

export default async function KycAdminPage({ searchParams }: PageProps) {
  const { q, bq } = await searchParams;
  const access = await getAccessContext();
  const isPlatform = access.context?.type === "platform";

  if (!isPlatform) {
    return (
      <div className="space-y-4 font-primary text-body">
        <h1 className="text-display font-semibold tracking-tight">KYC</h1>
        <p className="font-secondary text-caption text-muted-foreground">Platform admin only.</p>
      </div>
    );
  }

  const [kycRes, kybRes] = await Promise.all([
    getPeerRampKycUsersForAdmin(q, 100),
    getKybBusinessesForAdmin(bq, 100),
  ]);

  return (
    <div className="space-y-10 font-primary text-body">
      <div className="space-y-3">
        <h1 className="text-display font-semibold tracking-tight">Verification oversight</h1>
        <p className="max-w-3xl font-secondary text-caption text-muted-foreground leading-relaxed">
          Merchants complete <strong>user KYC</strong> (every member) and <strong>KYB</strong> (company, by the
          founding member) in the <strong>business dashboard</strong> when they choose — KYB is not done
          immediately after KYC. This Connect area is for <strong>platform operators</strong> only: search,
          reset, and database overrides — not where businesses file verification.
        </p>
      </div>
      {!kycRes.ok && kycRes.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-900">
          KYC: {kycRes.error}
        </div>
      ) : null}
      {!kybRes.ok && kybRes.error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-900">
          KYB: {kybRes.error}
        </div>
      ) : null}
      <Suspense fallback={null}>
        <KycAdminClient initialQ={q ?? ""} rows={kycRes.users} />
        <KybBusinessAdminClient initialBq={bq ?? ""} rows={kybRes.businesses} />
      </Suspense>
    </div>
  );
}

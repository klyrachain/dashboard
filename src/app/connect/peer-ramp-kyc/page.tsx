import { PeerRampKycClient } from "@/app/connect/peer-ramp-kyc/peer-ramp-kyc-client";
import { getAccessContext } from "@/lib/data-access";
import { getPeerRampKycUsersForAdmin } from "@/lib/data-peer-ramp-kyc";

type PageProps = {
  searchParams: Promise<{ q?: string }>;
};

export default async function PeerRampKycAdminPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const access = await getAccessContext();
  const isPlatform = access.context?.type === "platform";

  if (!isPlatform) {
    return (
      <div className="space-y-4 font-primary text-body">
        <h1 className="text-display font-semibold tracking-tight">Peer Ramp KYC</h1>
        <p className="font-secondary text-caption text-muted-foreground">
          Switch to platform admin context to manage Peer Ramp verification.
        </p>
      </div>
    );
  }

  const { ok, users, error } = await getPeerRampKycUsersForAdmin(q, 100);

  return (
    <div className="space-y-6 font-primary text-body">
      <div>
        <h1 className="text-display font-semibold tracking-tight">Peer Ramp KYC</h1>
        <p className="font-secondary text-caption text-muted-foreground mt-1">
          View KYC state, reset users so they can redo Didit/Persona, or set approved/declined in our database
          only (does not update Didit). Didit outcomes still arrive via Core webhooks.
        </p>
      </div>
      {!ok && error ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 font-secondary text-caption text-amber-900">
          {error}
        </div>
      ) : null}
      <PeerRampKycClient initialQ={q ?? ""} rows={users} />
    </div>
  );
}

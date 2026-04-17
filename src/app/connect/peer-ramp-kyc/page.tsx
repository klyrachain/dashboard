import { redirect } from "next/navigation";

/** @deprecated Use /connect/kyc */
export default async function PeerRampKycRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const p = await searchParams;
  const q = p.q?.trim();
  redirect(q ? `/connect/kyc?q=${encodeURIComponent(q)}` : "/connect/kyc");
}

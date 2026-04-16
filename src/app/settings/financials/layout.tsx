import { assertPlatformPortal } from "@/lib/server/assert-platform-portal";

export default async function FinancialsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformPortal();
  return <>{children}</>;
}

import { assertPlatformPortal } from "@/lib/server/assert-platform-portal";

export default async function ProvidersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformPortal();
  return <>{children}</>;
}

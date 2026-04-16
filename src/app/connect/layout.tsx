import { assertPlatformPortal } from "@/lib/server/assert-platform-portal";

export default async function ConnectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await assertPlatformPortal();
  return <>{children}</>;
}

import { redirect } from "next/navigation";
import { getAccessContext } from "@/lib/data-access";

/**
 * Super-admin-only routes. Merchant API keys must not reach these pages.
 */
export async function assertPlatformPortal(homePath = "/"): Promise<void> {
  const access = await getAccessContext();
  if (access.ok && access.context?.type === "merchant") {
    redirect(homePath);
  }
}

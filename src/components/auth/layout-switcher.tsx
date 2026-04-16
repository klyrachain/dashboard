"use client";

import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/layout/dashboard-shell";

const AUTH_PATHS = ["/login", "/signup", "/setup-passkey"];

function isAuthPath(pathname: string | null): boolean {
  if (!pathname) return false;
  const p = pathname.replace(/\/$/, "") || "/";
  return (
    AUTH_PATHS.includes(p) ||
    p.startsWith("/signup") ||
    p.startsWith("/login/") ||
    p.startsWith("/setup-passkey") ||
    p.startsWith("/business/signin") ||
    p.startsWith("/business/signup") ||
    p === "/business/login"
  );
}

export function LayoutSwitcher({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isAuthPath(pathname)) {
    return <>{children}</>;
  }
  return <DashboardShell>{children}</DashboardShell>;
}

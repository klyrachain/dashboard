"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  BadgeCheck,
  DollarSign,
  Route,
  Shield,
  Users,
  Webhook,
  Fuel,
  Layers,
  UserCircle,
} from "lucide-react";

const PLATFORM_TABS = [
  { href: "/settings/account", label: "Account", icon: UserCircle },
  { href: "/settings/kyc", label: "Identity (KYC)", icon: BadgeCheck },
  { href: "/settings/general", label: "General", icon: Settings },
  { href: "/settings/financials", label: "Financials", icon: DollarSign },
  { href: "/settings/providers", label: "Providers & Routing", icon: Route },
  { href: "/settings/provider-catalog", label: "Provider catalog", icon: Layers },
  { href: "/settings/risk", label: "Risk & Compliance", icon: Shield },
  { href: "/settings/gas", label: "Gas sponsorship", icon: Fuel },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/api", label: "API & Webhooks", icon: Webhook },
] as const;

/** Platform backoffice only; merchant settings use the main app sidebar (`merchantNavGroups`). */
export function SettingsSidebarClient() {
  const pathname = usePathname();

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/50">
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Settings sections">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          Platform control
        </p>
        {PLATFORM_TABS.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <tab.icon className="size-4 shrink-0" aria-hidden />
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

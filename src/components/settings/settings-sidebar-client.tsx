"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSelector } from "react-redux";
import { cn } from "@/lib/utils";
import type { RootState } from "@/store";
import {
  Settings,
  Building2,
  DollarSign,
  Route,
  Shield,
  Users,
  Webhook,
  Fuel,
} from "lucide-react";

const PLATFORM_TABS = [
  { href: "/settings/general", label: "General", icon: Settings },
  { href: "/settings/financials", label: "Financials", icon: DollarSign },
  { href: "/settings/providers", label: "Providers & Routing", icon: Route },
  { href: "/settings/risk", label: "Risk & Compliance", icon: Shield },
  { href: "/settings/gas", label: "Gas sponsorship", icon: Fuel },
  { href: "/settings/team", label: "Team", icon: Users },
  { href: "/settings/api", label: "API & Webhooks", icon: Webhook },
] as const;

const MERCHANT_TABS = [
  { href: "/settings/general", label: "Business & webhooks", icon: Building2 },
  { href: "/settings/gas", label: "Gas sponsorship", icon: Fuel },
  { href: "/settings/team", label: "Team", icon: Users },
] as const;

export function SettingsSidebarClient() {
  const pathname = usePathname();
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);
  const tabs = sessionType === "merchant" ? MERCHANT_TABS : PLATFORM_TABS;

  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-slate-50/50">
      <nav className="flex flex-col gap-0.5 p-3" aria-label="Settings sections">
        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          {sessionType === "merchant" ? "Business" : "Platform control"}
        </p>
        {tabs.map((tab) => {
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

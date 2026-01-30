"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Users,
  Package,
  Link2,
  FileText,
  Building2,
  Landmark,
  Key,
  Webhook,
  ScrollText,
  Settings,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

const coreNav = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/balances", label: "Balances", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/users", label: "Customers", icon: Users },
  { href: "/inventory", label: "Product catalog", icon: Package },
];

const offchainNav = [
  { href: "/providers", label: "Providers", icon: Building2 },
  { href: "/payment-links", label: "Payment Links", icon: Link2 },
  { href: "/invoices", label: "Invoices", icon: FileText },
];

const connectNav = [
  { href: "/", label: "Overview", icon: Building2 },
  { href: "/users", label: "Accounts", icon: Users },
  { href: "/transactions", label: "Payouts", icon: Landmark },
];

const developersNav = [
  { href: "/settings", label: "API Keys", icon: Key },
  { href: "/settings", label: "Webhooks", icon: Webhook },
  { href: "/logs", label: "Logs", icon: ScrollText },
];

function NavGroup({
  title,
  items,
  pathname,
}: {
  title: string;
  items: { href: string; label: string; icon: React.ComponentType<{ className?: string }> }[];
  pathname: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-medium text-white/50 hover:text-white/80"
      >
        {title}
        <ChevronRight
          className={cn("size-3.5 transition-transform", open && "rotate-90")}
        />
      </button>
      {open && (
        <nav className="space-y-0.5">
          {items.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-500/20 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                )}
              >
                <item.icon className="size-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}

export function AppSidebar() {
  const pathname = usePathname();
  const [testMode, setTestMode] = useState(true);

  return (
    <aside className="flex h-full w-64 flex-col bg-slate-900 text-white">
      {/* Workspace Switcher */}
      <div className="px-3 py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left text-sm font-medium text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
            >
              <Avatar className="size-8 rounded-md">
                <AvatarFallback className="rounded-md bg-indigo-500/80 text-white">
                  K
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate">Klyra sandbox</span>
              <ChevronDown className="size-4 shrink-0 text-white/60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-500">
              Workspace
            </div>
            <div className="rounded-md bg-slate-50 px-2 py-1.5 text-sm">
              Klyra sandbox
            </div>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-auto p-3">
        <NavGroup title="Core" items={coreNav} pathname={pathname} />
        <NavGroup title="Offchain" items={offchainNav} pathname={pathname} />
        <NavGroup title="Connect" items={connectNav} pathname={pathname} />
        <NavGroup title="Developers" items={developersNav} pathname={pathname} />
      </nav>

      <div className="space-y-1 p-3">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-indigo-500/20 text-white"
              : "text-white/70 hover:bg-white/10 hover:text-white"
          )}
        >
          <Settings className="size-4 shrink-0" aria-hidden />
          Settings
        </Link>
        <div className="flex items-center justify-between rounded-md px-3 py-2">
          <span className="text-sm font-normal text-white/60">
            Test mode
          </span>
          <Switch
            checked={testMode}
            onCheckedChange={setTestMode}
            aria-label="Toggle test mode"
            className="data-[state=checked]:bg-indigo-500"
          />
        </div>
      </div>
    </aside>
  );
}

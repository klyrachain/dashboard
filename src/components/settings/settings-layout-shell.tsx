"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { SettingsSidebarClient } from "@/components/settings/settings-sidebar-client";

export function SettingsLayoutShell({ children }: { children: React.ReactNode }) {
  const sessionType = useSelector((s: RootState) => s.merchantSession.sessionType);

  if (sessionType === "merchant") {
    return (
      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">{children}</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <SettingsSidebarClient />
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">{children}</main>
    </div>
  );
}

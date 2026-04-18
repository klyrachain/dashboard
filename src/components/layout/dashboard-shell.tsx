"use client";

import { useSelector } from "react-redux";
import type { RootState } from "@/store";
import { AppSidebar } from "./app-sidebar";
import { Topbar } from "./topbar";
import { HeaderNoSidebar } from "./header-no-sidebar";
import { StatusIndicator } from "@/components/status-indicator";
import { SingleLineFooter } from "../footer/singleLineFooter";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const theme = useSelector((state: RootState) => state.layout.theme);

  if (theme === "no-sidebar") {
    return (
      <div className="flex h-screen flex-col overflow-hidden">
        <HeaderNoSidebar />
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <main className="scrollbar-dashboard-main min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
            {children}
            <SingleLineFooter />
          </main>
        </div>
        <StatusIndicator />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AppSidebar />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar />
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden bg-slate-50">
          <main className="scrollbar-dashboard-main min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-6">
            {children}
            <SingleLineFooter />
          </main>
        </div>
      </div>
      <StatusIndicator />
    </div>
  );
}

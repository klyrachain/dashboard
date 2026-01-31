import { redirect } from "next/navigation";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1">
      <SettingsSidebar />
      <main className="min-w-0 flex-1 overflow-auto p-6 lg:p-8">
        {children}
      </main>
    </div>
  );
}

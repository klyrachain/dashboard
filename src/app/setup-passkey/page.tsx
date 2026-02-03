import { SetupPasskeyClient } from "@/components/auth/setup-passkey-client";

export const metadata = {
  title: "Set up passkey | Klyra Admin",
  description: "Add a passkey to sign in faster next time",
};

export default function SetupPasskeyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <SetupPasskeyClient />
      </div>
    </div>
  );
}

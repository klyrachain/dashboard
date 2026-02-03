import { LoginEmailStep } from "@/components/auth/login-email-step";

export const metadata = {
  title: "Sign in | Klyra Admin",
  description: "Sign in to the Klyra admin dashboard",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <LoginEmailStep />
      </div>
    </div>
  );
}

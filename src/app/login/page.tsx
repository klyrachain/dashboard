import { LoginEmailStep } from "@/components/auth/login-email-step";

export const metadata = {
  title: "Sign in | Morapay Admin",
  description: "Sign in to the Morapay admin dashboard",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen h-full flex-col items-center justify-center px-8 py-16 bg-background">
      <div className="w-full max-w-sm h-full">
        <LoginEmailStep />
      </div>
    </div>
  );
}

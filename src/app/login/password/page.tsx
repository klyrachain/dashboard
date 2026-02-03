import { LoginPasswordStep } from "@/components/auth/login-password-step";

export const metadata = {
  title: "Password | Sign in | Klyra Admin",
};

type Props = { searchParams: Promise<{ email?: string }> };

export default async function LoginPasswordPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <LoginPasswordStep email={email} />
      </div>
    </div>
  );
}

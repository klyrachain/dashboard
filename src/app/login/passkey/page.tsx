import { LoginPasskeyStep } from "@/components/auth/login-passkey-step";

export const metadata = {
  title: "Sign in with passkey | Morapay Admin",
};

type Props = { searchParams: Promise<{ email?: string }> };

export default async function LoginPasskeyPage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <LoginPasskeyStep key={email} email={email} />
      </div>
    </div>
  );
}

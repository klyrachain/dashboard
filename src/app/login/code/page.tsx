import { LoginCodeStep } from "@/components/auth/login-code-step";

export const metadata = {
  title: "Verification code | Sign in | Morapay Admin",
};

type Props = { searchParams: Promise<{ email?: string }> };

export default async function LoginCodePage({ searchParams }: Props) {
  const params = await searchParams;
  const email = params.email?.trim() ?? "";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <LoginCodeStep email={email} />
      </div>
    </div>
  );
}

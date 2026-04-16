import { SignupFlow } from "@/components/auth/signup-flow";

export const metadata = {
  title: "Sign up | Morapay Admin",
  description: "Create your account with an invite link",
};

type SignupPageProps = {
  searchParams: Promise<{ token?: string; step?: string }>;
};

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const params = await searchParams;
  const token = params.token?.trim() || undefined;
  const step = params.step?.trim() || "invite";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-8 py-16">
      <div className="w-full max-w-sm">
        <SignupFlow token={token} step={step} />
      </div>
    </div>
  );
}

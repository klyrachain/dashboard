import { redirect } from "next/navigation";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** @deprecated Use /business/signin */
export default async function LegacySigninRedirect({ searchParams }: Props) {
  const p = await searchParams;
  const q = new URLSearchParams();
  for (const [key, val] of Object.entries(p)) {
    if (typeof val === "string" && val) q.set(key, val);
    else if (Array.isArray(val) && val[0]) q.set(key, val[0]);
  }
  const s = q.toString();
  redirect(s ? `/business/signin?${s}` : "/business/signin");
}

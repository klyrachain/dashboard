import { redirect } from "next/navigation";

/** Legacy business onboarding used `/app`; merchant dashboard lives at `/`. */
export default function LegacyAppRedirectPage() {
  redirect("/");
}

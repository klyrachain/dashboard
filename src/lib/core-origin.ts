/** Core API base URL (no trailing slash). */
export function getCoreOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_CORE_URL?.trim() ||
    process.env.CORE_URL?.trim() ||
    "";
  return raw.replace(/\/+$/, "");
}

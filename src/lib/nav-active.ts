/**
 * Pick a single "active" nav href when several items share a prefix
 * (e.g. `/connect` vs `/connect/merchants`).
 */
function normalizePath(p: string): string {
  const t = (p || "/").trim();
  if (!t || t === "/") return "/";
  return t.replace(/\/+$/, "") || "/";
}

function hrefMatchesPath(pathname: string, href: string): boolean {
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (h === "/") return p === "/";
  return p === h || p.startsWith(`${h}/`);
}

/** Longest matching `href` wins so parent `/foo` is not active on `/foo/bar`. */
export function longestMatchingNavHref(
  pathname: string,
  hrefs: readonly string[]
): string | null {
  const matches = hrefs.filter((h) => hrefMatchesPath(pathname, h));
  if (matches.length === 0) return null;
  return matches.reduce((best, h) =>
    normalizePath(h).length >= normalizePath(best).length ? h : best
  );
}

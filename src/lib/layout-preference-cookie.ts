/**
 * UI layout preference stored in a cookie (theme, testMode).
 * Used for persistence across sessions.
 */

const COOKIE_NAME = "klyra_ui";
const MAX_AGE_DAYS = 365;

export type LayoutPreference = {
  theme: "sidebar" | "no-sidebar";
  testMode: boolean;
};

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)")
  );
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string, maxAgeDays: number): void {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(value);
  const maxAge = maxAgeDays * 24 * 60 * 60;
  document.cookie = `${name}=${encoded}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

/** Parse raw cookie value (e.g. from server cookies().get()). Use getLayoutPreferenceFromCookie() on client. */
export function parseLayoutPreference(raw: string | undefined): LayoutPreference | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as unknown;
    if (
      parsed &&
      typeof parsed === "object" &&
      "theme" in parsed &&
      (parsed.theme === "sidebar" || parsed.theme === "no-sidebar") &&
      "testMode" in parsed &&
      typeof parsed.testMode === "boolean"
    ) {
      return { theme: parsed.theme, testMode: parsed.testMode };
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

export function getLayoutPreferenceFromCookie(): LayoutPreference | null {
  const raw = getCookie(COOKIE_NAME);
  return parseLayoutPreference(raw ?? undefined);
}

export function setLayoutPreferenceCookie(pref: LayoutPreference): void {
  setCookie(COOKIE_NAME, JSON.stringify(pref), MAX_AGE_DAYS);
}

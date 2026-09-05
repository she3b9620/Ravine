export type RavineLocale = "ar" | "en";

export const RAVINE_LOCALE_STORAGE_KEY = "ravine.locale";
export const RAVINE_LOCALE_COOKIE = "ravine_locale";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function isRavineLocale(value: string | null | undefined): value is RavineLocale {
  return value === "ar" || value === "en";
}

export function persistRavineLocale(locale: RavineLocale) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(RAVINE_LOCALE_STORAGE_KEY, locale);
  } catch {
    // Local storage can be unavailable in privacy-restricted contexts.
  }

  document.cookie = `${RAVINE_LOCALE_COOKIE}=${locale}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax`;
}

export function getPersistedRavineLocale(): RavineLocale | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = window.localStorage.getItem(RAVINE_LOCALE_STORAGE_KEY);
    return isRavineLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

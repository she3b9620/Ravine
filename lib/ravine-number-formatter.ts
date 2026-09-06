export type RavineNumberLocale = "ar" | "en";

const ARABIC_NUMBER_LOCALE = "ar-EG-u-nu-arab";

export function formatRavineNumber(value: number | null | undefined, locale: RavineNumberLocale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "0";
  return new Intl.NumberFormat(locale === "ar" ? ARABIC_NUMBER_LOCALE : "en-US", {
    maximumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.max(0, value));
}

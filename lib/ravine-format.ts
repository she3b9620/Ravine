const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const WESTERN_DIGITS = "0123456789";

export function westernDigits(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => WESTERN_DIGITS[ARABIC_DIGITS.indexOf(digit)])
    .replace(/[۰-۹]/g, (digit) => WESTERN_DIGITS[PERSIAN_DIGITS.indexOf(digit)]);
}

export function ravineNumber(value: number | null | undefined, locale: "ar" | "en" = "en") {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", { useGrouping: true }).format(Number(value ?? 0));
}

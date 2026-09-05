const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const WESTERN_DIGITS = "0123456789";

export type DigitStyle = "western" | "arabic";

export function westernDigits(value: string | number | null | undefined) {
  return String(value ?? "")
    .replace(/[٠-٩]/g, (digit) => WESTERN_DIGITS[ARABIC_DIGITS.indexOf(digit)])
    .replace(/[۰-۹]/g, (digit) => WESTERN_DIGITS[PERSIAN_DIGITS.indexOf(digit)]);
}

export function ravineNumber(
  value: number | null | undefined,
  locale: "ar" | "en" = "en",
  digitStyle: DigitStyle = "western",
) {
  const numericValue = Number(value ?? 0);
  const formattingLocale = digitStyle === "arabic" && locale === "ar" ? "ar-EG" : "en-US";
  return new Intl.NumberFormat(formattingLocale, { useGrouping: true }).format(numericValue);
}

export function ravineArabicNumber(value: number | null | undefined) {
  return ravineNumber(value, "ar", "arabic");
}

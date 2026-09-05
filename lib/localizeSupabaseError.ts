export function localizeSupabaseError(error: unknown, locale: "ar" | "en", fallbackArabic = "تعذر تنفيذ العملية حاليًا.") {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const ar = locale === "ar";

  if (/permission denied for table follows/i.test(message)) {
    return ar ? "لا تملك صلاحية الوصول إلى المتابعات حاليًا." : message;
  }

  if (ar && /permission denied/i.test(message)) {
    return "لا تملك صلاحية تنفيذ هذه العملية حاليًا.";
  }

  return ar ? fallbackArabic : message;
}

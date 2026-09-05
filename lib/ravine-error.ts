export type RavineErrorLocale = "ar" | "en";

export function ravineErrorMessage(error: unknown, locale: RavineErrorLocale) {
  const ar = locale === "ar";
  const text = error instanceof Error ? error.message : String(error ?? "");
  const normalized = text.toLowerCase();

  if (!text.trim()) return ar ? "تعذر تنفيذ العملية حاليًا." : "The action could not be completed right now.";

  if (normalized.includes("permission denied") || normalized.includes("insufficient privilege") || normalized.includes("row-level security")) {
    return ar
      ? "تعذر الوصول إلى هذه البيانات بسبب صلاحيات الوصول. حاول مرة أخرى، وإذا استمرت المشكلة سنحتاج إلى مراجعة إعدادات الوصول في قاعدة البيانات."
      : "These data could not be accessed because of an access-permission issue. Please try again; persistent issues may require a database access review.";
  }

  if (normalized.includes("infinite recursion detected in policy")) {
    return ar
      ? "تعذر الوصول إلى بعض البيانات بسبب خطأ في صلاحيات قاعدة البيانات. حاول مرة أخرى."
      : "Some data could not be accessed because of a database access-policy error. Please try again.";
  }

  if (normalized.includes("relation ") && normalized.includes(" does not exist")) {
    return ar
      ? "هذه الميزة غير متاحة حاليًا بسبب إعداد غير مكتمل في قاعدة البيانات."
      : "This feature is currently unavailable because part of the database setup is incomplete.";
  }

  if (normalized.includes("column ") && normalized.includes(" does not exist")) {
    return ar
      ? "تعذر تحميل هذه البيانات بسبب اختلاف في بنية قاعدة البيانات. حاول مرة أخرى."
      : "These data could not be loaded because the database structure is out of sync. Please try again.";
  }

  if (normalized.includes("failed to fetch") || normalized.includes("network") || normalized.includes("fetch failed")) {
    return ar
      ? "تعذر الاتصال بالخدمة حاليًا. تحقق من اتصال الإنترنت وحاول مرة أخرى."
      : "The service could not be reached right now. Check your internet connection and try again.";
  }

  if (normalized.includes("invalid login credentials") || normalized.includes("invalid credentials")) {
    return ar ? "بيانات تسجيل الدخول غير صحيحة." : "The sign-in details are not valid.";
  }

  if (normalized.includes("email not confirmed")) {
    return ar ? "يرجى تأكيد بريدك الإلكتروني أولًا." : "Please confirm your email address first.";
  }

  return ar
    ? "حدث خطأ غير متوقع أثناء تنفيذ العملية. حاول مرة أخرى."
    : "An unexpected error occurred while completing the action. Please try again.";
}

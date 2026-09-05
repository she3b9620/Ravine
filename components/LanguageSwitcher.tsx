"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "ar" | "en";

const LANGUAGE_FLAGS = {
  ar: ["🇪🇬", "🇸🇦", "🇵🇸"],
  en: ["🇬🇧", "🇺🇸", "🇨🇦", "🇦🇺"],
} as const;

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const alternateLocale: Locale = locale === "ar" ? "en" : "ar";
  const segments = pathname.split("/");

  if (segments[1] === "ar" || segments[1] === "en") segments[1] = alternateLocale;
  else segments.splice(1, 0, alternateLocale);

  const query = searchParams.toString();
  const href = `${segments.join("/")}${query ? `?${query}` : ""}`;
  const flags = LANGUAGE_FLAGS[locale];
  const label = locale === "ar" ? "العربية" : "English";
  const switchLabel = locale === "ar" ? "Switch to English" : "التبديل إلى العربية";

  return (
    <Link href={href} className="ravine-language" aria-label={switchLabel} title={switchLabel}>
      <span className="ravine-language-flags" aria-hidden="true">
        {flags.map((flag, index) => (
          <span key={flag} className="ravine-language-flag" style={{ zIndex: flags.length - index }}>{flag}</span>
        ))}
      </span>
      <span className="ravine-language-copy">
        <span className="ravine-language-label">{label}</span>
        <span className="ravine-language-arrow" aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}

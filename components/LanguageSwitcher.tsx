"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

type Locale = "ar" | "en";

export default function LanguageSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const alternateLocale: Locale = locale === "ar" ? "en" : "ar";

  const segments = pathname.split("/");
  if (segments[1] === "ar" || segments[1] === "en") {
    segments[1] = alternateLocale;
  } else {
    segments.splice(1, 0, alternateLocale);
  }

  const query = searchParams.toString();
  const href = `${segments.join("/")}${query ? `?${query}` : ""}`;

  return (
    <Link href={href} className="ravine-language">
      {locale === "ar" ? "EN" : "عربي"}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Locale = "ar" | "en";

type Item = readonly [slug: string, en: string, ar: string];

const navigation: Item[] = [
  ["discover", "Discover", "اكتشف"],
  ["cuts", "Cuts", "كِتس"],
  ["videos", "Videos", "الفيديو"],
  ["podcasts", "Podcasts", "البودكاست"],
  ["live", "Live", "مباشر"],
  ["creators", "Creators", "المبدعون"],
  ["community", "Community", "المجتمعات"],
];

export default function PrimaryNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  function isActive(slug: string) {
    return pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`);
  }

  return (
    <nav className="ravine-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      {navigation.map(([slug, en, ar]) => {
        const active = isActive(slug);
        return (
          <Link
            key={slug}
            href={`/${locale}/${slug}`}
            className={`ravine-nav-link${active ? " is-active" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            {locale === "ar" ? ar : en}
          </Link>
        );
      })}
    </nav>
  );
}

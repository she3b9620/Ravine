"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Compass, Clapperboard, PlaySquare, Mic2, Radio, Users, MessagesSquare } from "lucide-react";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Compass];

const navigation: Item[] = [
  ["discover", "Discover", "اكتشف", Compass],
  ["cuts", "Cuts", "كِتس", Clapperboard],
  ["videos", "Videos", "الفيديو", PlaySquare],
  ["podcasts", "Podcasts", "البودكاست", Mic2],
  ["live", "Live", "مباشر", Radio],
  ["creators", "Creators", "المبدعون", Users],
  ["community", "Community", "المجتمعات", MessagesSquare],
];

export default function PrimaryNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  function isActive(slug: string) {
    return pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`);
  }

  return (
    <nav className="ravine-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      {navigation.map(([slug, en, ar, Icon]) => {
        const active = isActive(slug);
        return (
          <Link
            key={slug}
            href={`/${locale}/${slug}`}
            className={`ravine-nav-link${active ? " is-active" : ""}${slug === "live" ? " is-live-link" : ""}`}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="ravine-nav-icon" size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{locale === "ar" ? ar : en}</span>
            {slug === "live" ? <span className="ravine-live-dot" aria-hidden="true" /> : null}
          </Link>
        );
      })}
    </nav>
  );
}

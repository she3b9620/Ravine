"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Clapperboard, PlaySquare, Mic2, Radio, Users, MessagesSquare } from "lucide-react";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];

const navigation: Item[] = [
  ["", "Home", "الرئيسية", Home],
  ["discover", "Discover", "اكتشف", Compass],
  ["cuts", "Cuts", "كِتس", Clapperboard],
  ["videos", "Videos", "الفيديو", PlaySquare],
  ["podcasts", "Podcasts", "البودكاست", Mic2],
  ["live", "Live", "مباشر", Radio],
  ["creators", "Creators", "المبدعون", Users],
  ["community", "Community", "المجتمع", MessagesSquare],
];

export default function PrimaryNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;

  function isActive(slug: string) {
    return !slug
      ? pathname === `/${locale}`
      : pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`);
  }

  return (
    <nav className="ravine-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      {navigation.map(([slug, en, ar, Icon]) => {
        const active = isActive(slug);
        const href = slug ? `/${locale}/${slug}` : `/${locale}`;
        return (
          <Link
            key={slug || "home"}
            href={href}
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Scissors, Clapperboard, Radio, Mic2, Film, Users, MessagesSquare } from "lucide-react";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];

const navigation: Item[] = [["", "Home", "الرئيسية", Home], ["discover", "Discover", "اكتشف", Compass], ["shorts", "Shorts", "الشورتات", Scissors], ["videos", "Videos", "الفيديوهات", Clapperboard], ["live", "Live", "مباشر", Radio], ["podcasts", "Podcasts", "البودكاست", Mic2], ["documentaries", "Documentaries", "الأفلام الوثائقية", Film], ["creators", "Creators", "المبدعون", Users], ["community", "Community", "المجتمع", MessagesSquare]];

export default function PrimaryNav({ locale, authenticated = false }: { locale: Locale; authenticated?: boolean }) {
  const pathname = usePathname() || `/${locale}`;
  function isActive(slug: string) { return !slug ? pathname === `/${locale}` : pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`); }
  function handleGuestNavigation() { requestRavineAuth(pathname); return true; }
  return (
    <nav className="ravine-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      {navigation.map(([slug, en, ar, Icon]) => {
        const active = isActive(slug);
        const href = slug ? `/${locale}/${slug}` : `/${locale}`;
        return (
          <Link key={slug || "home"} href={href} className={`ravine-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}>
            <Icon className="ravine-nav-icon" size={14} strokeWidth={1.8} aria-hidden="true" />
            <span>{locale === "ar" ? ar : en}</span>
          </Link>
        );
      })}
    </nav>
  );
}

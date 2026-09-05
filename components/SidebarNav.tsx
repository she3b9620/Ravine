"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Users, MessagesSquare, Radio, Mic2 } from "lucide-react";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];

const navigation: Item[] = [
  ["", "Home", "الرئيسية", Home],
  ["discover", "Discover", "استكشف الأعمال", Compass],
  ["creators", "Creators", "المبدعون", Users],
  ["community", "Community", "المجتمع", MessagesSquare],
  ["live", "Live", "مباشر", Radio],
  ["podcasts", "Podcasts", "البودكاست", Mic2],
];

export default function SidebarNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const isActive = (slug: string) => !slug ? pathname === `/${locale}` : pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`);

  return (
    <nav className="ravine-sidebar-nav" aria-label={locale === "ar" ? "التنقل الجانبي" : "Sidebar navigation"}>
      <div className="ravine-sidebar-nav-label">{locale === "ar" ? "استكشف RAVINE" : "Explore RAVINE"}</div>
      <div className="ravine-sidebar-nav-list">
        {navigation.map(([slug, en, ar, Icon]) => {
          const active = isActive(slug);
          return (
            <Link key={slug || "home"} href={`/${locale}${slug ? `/${slug}` : ""}`} className={`ravine-sidebar-link${active ? " is-active" : ""}${slug === "live" ? " is-live-link" : ""}`} aria-current={active ? "page" : undefined}>
              <span className="ravine-sidebar-link-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
              <span className="ravine-sidebar-link-label">{locale === "ar" ? ar : en}</span>
              {slug === "live" ? <span className="ravine-sidebar-live-dot" aria-hidden="true" /> : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

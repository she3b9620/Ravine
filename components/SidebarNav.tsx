"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, History, Library, Users, MessagesSquare, Radio, Mic2, LayoutDashboard } from "lucide-react";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];
type Group = readonly [titleEn: string, titleAr: string, items: Item[]];

const groups: Group[] = [
  [
    "RAVINE",
    "رَافِين",
    [
      ["", "Home", "الرئيسية", Home],
      ["discover", "Explore work", "استكشف الأعمال", Compass],
      ["creators", "Creators", "المبدعون", Users],
      ["community", "Community", "المجتمع", MessagesSquare],
      ["live", "Live", "مباشر", Radio],
      ["podcasts", "Podcasts", "البودكاست", Mic2],
    ],
  ],
  [
    "YOUR RAVINE",
    "مساحتك",
    [
      ["history", "Watch history", "سجل المشاهدة", History],
      ["library", "Saved work", "المحفوظات", Library],
      ["messages", "Messages", "الرسائل", MessagesSquare],
    ],
  ],
  [
    "MANAGE",
    "إدارة المساحة",
    [
      ["dashboard", "Your dashboard", "لوحتك", LayoutDashboard],
    ],
  ],
];

export default function SidebarNav({ locale }: { locale: Locale }) {
  const pathname = usePathname() || `/${locale}`;
  const isActive = (slug: string) => !slug
    ? pathname === `/${locale}`
    : pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`);

  return (
    <nav className="ravine-sidebar-nav" aria-label={locale === "ar" ? "التنقل الجانبي" : "Sidebar navigation"}>
      {groups.map(([titleEn, titleAr, items]) => (
        <section className="ravine-sidebar-group" key={titleEn}>
          <div className="ravine-sidebar-nav-label">{locale === "ar" ? titleAr : titleEn}</div>
          <div className="ravine-sidebar-nav-list">
            {items.map(([slug, en, ar, Icon]) => {
              const active = isActive(slug);
              return (
                <Link
                  key={slug || "home"}
                  href={`/${locale}${slug ? `/${slug}` : ""}`}
                  className={`ravine-sidebar-link${active ? " is-active" : ""}${slug === "live" ? " is-live-link" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <span className="ravine-sidebar-link-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="ravine-sidebar-link-label">{locale === "ar" ? ar : en}</span>
                  {slug === "live" ? <span className="ravine-sidebar-live-dot" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Scissors, Clapperboard, Users, History, Library, Heart, MessagesSquare, Radio, Mic2, Film, LayoutDashboard, UserRound, Settings } from "lucide-react";
import { requestRavineAuth } from "./AuthModal";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];
type Group = readonly [titleEn: string, titleAr: string, items: Item[]];

const publicGroups: Group[] = [["RAVINE", "رَافِين", [["", "Home", "الرئيسية", Home], ["discover", "Discover", "اكتشف", Compass], ["cuts", "Cuts", "كتس", Scissors], ["videos", "Videos", "الفيديوهات", Clapperboard], ["live", "Live", "مباشر", Radio], ["podcasts", "Podcasts", "البودكاست", Mic2], ["documentaries", "Documentary", "الوثائقي", Film], ["creators", "Creators", "المبدعون", Users], ["community", "Community", "المجتمع", MessagesSquare]]]];
const privateGroups: Group[] = [["YOUR SPACE", "مساحتك", [["creators?tab=following", "Following", "تتابعهم", Users], ["library", "Library", "المكتبة", Library], ["history", "Watch history", "سجل المشاهدة", History], ["library?tab=liked", "Liked work", "الأعمال التي أعجبتك", Heart], ["messages", "Messages", "الرسائل", MessagesSquare]]], ["CREATE & MANAGE", "إنشاء وإدارة", [["creator", "Creator space", "مساحة المبدع", Clapperboard], ["dashboard", "Your dashboard", "لوحتك", LayoutDashboard], ["account", "Your account", "حسابك", UserRound]]]];
const GUEST_GATED = new Set(["community", "cuts", "videos", "live", "podcasts", "documentaries"]);

export default function SidebarNav({ locale, authenticated }: { locale: Locale; authenticated: boolean }) {
  const pathname = usePathname() || `/${locale}`;
  const groups = authenticated ? [...publicGroups, ...privateGroups] : publicGroups;
  const isActive = (slug: string) => { const [path] = slug.split("?"); return !path ? pathname === `/${locale}` : pathname === `/${locale}/${path}` || pathname.startsWith(`/${locale}/${path}/`); };
  const authDestination = () => pathname || `/${locale}`;
  return (
    <nav className="ravine-sidebar-nav" aria-label={locale === "ar" ? "التنقل الجانبي" : "Sidebar navigation"}>
      {groups.map(([titleEn, titleAr, items]) => (
        <section className="ravine-sidebar-group" key={titleEn}>
          <div className="ravine-sidebar-nav-label">{locale === "ar" ? titleAr : titleEn}</div>
          <div className="ravine-sidebar-nav-list">
            {items.map(([slug, en, ar, Icon]) => {
              const active = isActive(slug);
              const href = slug ? `/${locale}/${slug}` : `/${locale}`;
              const gated = !authenticated && GUEST_GATED.has(slug.split("?")[0]);
              return gated ? (
                <button key={slug} type="button" className={`ravine-sidebar-link${active ? " is-active" : ""}${slug === "live" ? " is-live-link" : ""}`} onClick={() => requestRavineAuth(authDestination())} aria-label={locale === "ar" ? `${ar} — سجّل للدخول` : `${en} — sign in to continue`}>
                  <span className="ravine-sidebar-link-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="ravine-sidebar-link-label">{locale === "ar" ? ar : en}</span>
                  {slug === "live" ? <span className="ravine-sidebar-live-dot" aria-hidden="true" /> : null}
                </button>
              ) : (
                <Link key={slug} href={href} className={`ravine-sidebar-link${active ? " is-active" : ""}${slug === "live" ? " is-live-link" : ""}`} aria-current={active ? "page" : undefined}>
                  <span className="ravine-sidebar-link-icon"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                  <span className="ravine-sidebar-link-label">{locale === "ar" ? ar : en}</span>
                  {slug === "live" ? <span className="ravine-sidebar-live-dot" aria-hidden="true" /> : null}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
      {authenticated ? <section className="ravine-sidebar-group ravine-sidebar-settings-group"><div className="ravine-sidebar-nav-list"><Link href={`/${locale}/account/edit`} className={`ravine-sidebar-link${isActive("account/edit") ? " is-active" : ""}`} aria-current={isActive("account/edit") ? "page" : undefined}><span className="ravine-sidebar-link-icon"><Settings size={18} strokeWidth={1.8} aria-hidden="true" /></span><span className="ravine-sidebar-link-label">{locale === "ar" ? "الإعدادات" : "Settings"}</span></Link></div></section> : null}
    </nav>
  );
}

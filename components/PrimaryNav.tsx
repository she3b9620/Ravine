"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Compass, Scissors, Clapperboard, Radio, Mic2, Film, Users, MessagesSquare, LockKeyhole } from "lucide-react";
import { requestRavineAuth } from "./AuthModal";

type Locale = "ar" | "en";
type Item = readonly [slug: string, en: string, ar: string, icon: typeof Home];

const navigation: Item[] = [["", "Home", "الرئيسية", Home], ["discover", "Discover", "اكتشف", Compass], ["cuts", "Cuts", "كتس", Scissors], ["videos", "Videos", "الفيديوهات", Clapperboard], ["live", "Live", "مباشر", Radio], ["podcasts", "Podcasts", "البودكاست", Mic2], ["documentaries", "Documentary", "الوثائقي", Film], ["creators", "Creators", "المبدعون", Users], ["community", "Community", "المجتمع", MessagesSquare]];
const GUEST_GATED = new Set(["community", "cuts", "videos", "live", "podcasts", "documentaries"]);

export default function PrimaryNav({ locale, authenticated = false }: { locale: Locale; authenticated?: boolean }) {
  const pathname = usePathname() || `/${locale}`;
  function isActive(slug: string) { return !slug ? pathname === `/${locale}` : pathname === `/${locale}/${slug}` || pathname.startsWith(`/${locale}/${slug}/`); }
  function handleGuestNavigation() { requestRavineAuth(pathname); return true; }
  return (
    <nav className="ravine-nav" aria-label={locale === "ar" ? "التنقل الرئيسي" : "Primary navigation"}>
      {navigation.map(([slug, en, ar, Icon]) => {
        const active = isActive(slug);
        const href = slug ? `/${locale}/${slug}` : `/${locale}`;
        const gated = !authenticated && GUEST_GATED.has(slug);
        return gated ? <button key={slug || "home"} type="button" className={`ravine-nav-link ravine-nav-gated${active ? " is-active" : ""}`} onClick={handleGuestNavigation} aria-label={locale === "ar" ? `${ar} — سجّل للدخول` : `${en} — sign in to continue`} title={locale === "ar" ? "سجّل للدخول للمتابعة" : "Sign in to continue"} style={{ border: 0, padding: 0, background: "transparent", appearance: "none", WebkitAppearance: "none", cursor: "pointer" }}><Icon className="ravine-nav-icon" size={14} strokeWidth={1.8} aria-hidden="true" /><span>{locale === "ar" ? ar : en}</span><LockKeyhole aria-hidden="true" size={10} strokeWidth={2} style={{ opacity: 0.55, marginInlineStart: 2 }} /></button> : <Link key={slug || "home"} href={href} className={`ravine-nav-link${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><Icon className="ravine-nav-icon" size={14} strokeWidth={1.8} aria-hidden="true" /><span>{locale === "ar" ? ar : en}</span></Link>;
      })}
    </nav>
  );
}

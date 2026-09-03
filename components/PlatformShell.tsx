"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  Bell,
  Clapperboard,
  Compass,
  Home,
  Library,
  Menu,
  Mic2,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Users,
  Video,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
  active?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
};

type NavItem = {
  key: string;
  icon: LucideIcon;
  en: string;
  ar: string;
  path: string;
};

const mainItems: NavItem[] = [
  { key: "home", icon: Home, en: "Home", ar: "الرئيسية", path: "" },
  { key: "discover", icon: Compass, en: "Discover", ar: "اكتشف", path: "/discover" },
  { key: "shorts", icon: Zap, en: "Cuts", ar: "شورتس", path: "/shorts" },
  { key: "videos", icon: Video, en: "Videos", ar: "فيديوهات", path: "/videos" },
  { key: "podcasts", icon: Mic2, en: "Podcasts", ar: "بودكاست", path: "/podcasts" },
  { key: "live", icon: Clapperboard, en: "Live", ar: "بث مباشر", path: "/live" },
  { key: "creators", icon: Users, en: "Creators", ar: "المبدعون", path: "/creators" },
];

export default function PlatformShell({ children, active = "", title, eyebrow, description }: Props) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [userName, setUserName] = useState("");
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUserName(data.session?.user?.email?.split("@")[0] || "");
    }).catch(() => {
      if (mounted) setUserName("");
    });

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const bg = dark ? "#090909" : "#F1E9DC";
  const panel = dark ? "rgba(21,23,25,.78)" : "rgba(248,244,236,.82)";
  const text = dark ? "#F1E9DC" : "#111111";
  const muted = dark ? "rgba(241,233,220,.54)" : "rgba(17,17,17,.54)";
  const line = dark ? "rgba(241,233,220,.09)" : "rgba(17,17,17,.10)";
  const accent = "#C47A52";
  const teal = "#183F46";
  const href = (path: string) => (path ? `/${locale}${path}` : `/${locale}`);

  const renderItem = (item: NavItem) => {
    const Icon = item.icon;
    const isActive = active === item.key;
    return (
      <a
        key={item.key}
        href={href(item.path)}
        onClick={() => setOpen(false)}
        className="group relative flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition duration-200"
        style={{
          background: isActive ? `${accent}16` : "transparent",
          color: isActive ? text : muted,
          fontWeight: isActive ? 700 : 600,
        }}
        aria-current={isActive ? "page" : undefined}
      >
        {isActive && <span className="absolute inset-y-2 start-0 w-0.5 rounded-full" style={{ background: accent }} aria-hidden="true" />}
        <span
          className="flex h-8 w-8 items-center justify-center rounded-[10px]"
          style={{ background: isActive ? `${accent}1c` : "transparent", color: isActive ? accent : "inherit" }}
        >
          <Icon size={17} strokeWidth={isActive ? 2.1 : 1.8} />
        </span>
        <span>{isArabic ? item.ar : item.en}</span>
      </a>
    );
  };

  async function signOut() {
    if (isSigningOut) return;
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = href("");
    }
  }

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="ravine-platform-shell min-h-screen" style={{ background: bg, color: text }}>
      <div className="fixed inset-x-0 top-0 z-[80] h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      <header className="sticky top-0 z-50 border-b backdrop-blur-2xl" style={{ background: dark ? "rgba(9,9,9,.82)" : "rgba(241,233,220,.86)", borderColor: line }}>
        <div className="mx-auto flex h-[74px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-[12px] border lg:hidden" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "فتح القائمة" : "Open menu"}><Menu size={18} /></button>
          <a href={href("")} className="shrink-0" aria-label="RAVINE home"><img src="/RAVINE.png" alt="RAVINE" className="h-11 w-auto object-contain" /></a>

          <div className="ms-auto flex items-center gap-2">
            <a href={href("/search")} className="flex h-10 w-10 items-center justify-center rounded-full border sm:w-auto sm:px-3" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "البحث" : "Search"}><Search size={17} /><span className="hidden px-2 text-xs sm:inline">{isArabic ? "ابحث" : "Search"}</span></a>
            <a href={locale === "ar" ? "/en" : "/ar"} className="hidden rounded-full border px-3 py-2 text-[11px] font-bold sm:block" style={{ borderColor: line, background: panel }}>{locale === "ar" ? "EN" : "AR"}</a>
            <button onClick={() => setDark((value) => !value)} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "تغيير المظهر" : "Toggle theme"}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            {userName && <a href={href("/notifications")} className="hidden h-10 w-10 items-center justify-center rounded-full border md:flex" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "الإشعارات" : "Notifications"}><Bell size={16} /></a>}
            {userName ? (
              <div className="hidden items-center gap-2 md:flex">
                <a href={href("/account")} className="flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold" style={{ borderColor: line, background: panel }}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${teal}, ${accent})` }}>{userName.charAt(0).toUpperCase()}</span>
                  <span className="max-w-28 truncate">{userName}</span>
                </a>
                <button type="button" disabled={isSigningOut} onClick={() => void signOut()} className="rounded-full border px-3 py-2 text-[11px] font-bold disabled:opacity-50" style={{ borderColor: line, background: panel, color: muted }}>{isSigningOut ? (isArabic ? "جارٍ الخروج..." : "Signing out...") : (isArabic ? "تسجيل الخروج" : "Sign out")}</button>
              </div>
            ) : <a href={href("/auth")} className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: accent, color: bg }}>{isArabic ? "دخول" : "Sign in"}</a>}
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 start-0 top-[74px] z-40 hidden w-[236px] border-e p-4 lg:block" style={{ borderColor: line, background: dark ? "rgba(9,9,9,.70)" : "rgba(241,233,220,.72)" }}>
        <div className="flex h-full flex-col">
          <div className="space-y-1">{mainItems.map(renderItem)}</div>
          <div className="my-5 h-px" style={{ background: line }} />
          <div className="space-y-1">
            <a href={href("/library")} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition" style={{ color: muted }}><span className="flex h-8 w-8 items-center justify-center rounded-[10px]"><Library size={17} /></span>{isArabic ? "مكتبتي" : "Library"}</a>
            <a href={href("/account/security")} className="flex items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm transition" style={{ color: muted }}><span className="flex h-8 w-8 items-center justify-center rounded-[10px]"><Settings2 size={17} /></span>{isArabic ? "الإعدادات" : "Settings"}</a>
          </div>
          <div className="mt-auto border-t pt-4" style={{ borderColor: line }}>
            <div className="px-2">
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: accent }}><Sparkles size={14} />{isArabic ? "مساحة للمبدعين" : "For creators"}</div>
              <p className="mt-2 text-xs leading-5" style={{ color: muted }}>{isArabic ? "اعرض أفضل أعمالك في مساحة صُممت حولك." : "Put your best work in a platform designed around creators."}</p>
              <a href={href("/creator")} className="mt-3 inline-flex rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: `${accent}55`, color: accent }}>{isArabic ? "ابدأ الإبداع" : "Start creating"}</a>
            </div>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}><aside className="h-full w-[min(86vw,320px)] border-e p-5" style={{ background: bg, borderColor: line }} onClick={(event) => event.stopPropagation()}><div className="flex items-center justify-between"><img src="/RAVINE.png" alt="RAVINE" className="h-11 w-auto" /><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: line }} aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}><X size={18} /></button></div><div className="mt-8 space-y-1">{mainItems.map(renderItem)}</div></aside></div>}

      <main className="lg:ps-[236px]">
        {(title || eyebrow) && (
          <div className="mx-auto max-w-[1440px] px-5 pb-1 pt-10 md:px-8 lg:px-10">
            {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: accent }}>{eyebrow}</p>}
            {title && <h1 className="mt-3 max-w-5xl text-4xl font-black tracking-[-.035em] md:text-5xl">{title}</h1>}
            {description && <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: muted }}>{description}</p>}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}

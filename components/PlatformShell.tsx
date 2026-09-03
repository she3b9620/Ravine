"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  Bell,
  BookOpen,
  Clapperboard,
  Compass,
  Film,
  Gamepad2,
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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: React.ReactNode;
  active?: string;
  title?: string;
  eyebrow?: string;
  description?: string;
};

const mainItems = [
  ["home", Home, "Home", "الرئيسية", ""],
  ["discover", Compass, "Discover", "اكتشف", "/discover"],
  ["shorts", Zap, "Cuts", "شورتس", "/shorts"],
  ["videos", Video, "Videos", "فيديوهات", "/videos"],
  ["podcasts", Mic2, "Podcasts", "بودكاست", "/podcasts"],
  ["live", Clapperboard, "Live", "بث مباشر", "/live"],
  ["creators", Users, "Creators", "المبدعون", "/creators"],
];

export default function PlatformShell({ children, active = "", title, eyebrow, description }: Props) {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [userName, setUserName] = useState("");

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const user = data.user;
      setUserName(user?.email?.split("@")[0] || "");
    });
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const bg = dark ? "#090909" : "#F1E9DC";
  const panel = dark ? "rgba(21,23,25,.80)" : "rgba(248,244,236,.84)";
  const text = dark ? "#F1E9DC" : "#111111";
  const muted = dark ? "rgba(241,233,220,.54)" : "rgba(17,17,17,.54)";
  const line = dark ? "rgba(241,233,220,.10)" : "rgba(17,17,17,.10)";
  const accent = "#C47A52";
  const teal = "#183F46";
  const href = (path: string) => path ? `/${locale}${path}` : `/${locale}`;

  return (
    <div dir={isArabic ? "rtl" : "ltr"} className="min-h-screen" style={{ background: bg, color: text }}>
      <div className="fixed inset-x-0 top-0 z-[80] h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />

      <header className="sticky top-0 z-50 border-b backdrop-blur-2xl" style={{ background: dark ? "rgba(9,9,9,.82)" : "rgba(241,233,220,.84)", borderColor: line }}>
        <div className="mx-auto flex h-[74px] max-w-[1600px] items-center gap-3 px-4 sm:px-6 lg:px-8">
          <button onClick={() => setOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-2xl border lg:hidden" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "فتح القائمة" : "Open menu"}>
            <Menu size={18} />
          </button>
          <a href={href("")} className="shrink-0">
            <img src="/RAVINE.png" alt="RAVINE" className="h-11 w-auto object-contain" />
          </a>
          <div className="hidden flex-1 items-center justify-center lg:flex">
            <nav className="flex items-center gap-1 rounded-full border p-1" style={{ borderColor: line, background: panel }}>
              {mainItems.slice(0, 5).map(([key, Icon, en, ar, path]) => (
                <a key={key as string} href={href(path as string)} className="flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition hover:-translate-y-0.5" style={{ background: active === key ? `${accent}22` : "transparent", color: active === key ? accent : muted }}>
                  <Icon size={15} />
                  <span>{isArabic ? ar : en}</span>
                </a>
              ))}
            </nav>
          </div>
          <div className="ms-auto flex items-center gap-2">
            <a href={href("/search")} className="flex h-10 w-10 items-center justify-center rounded-full border sm:w-auto sm:px-3" style={{ borderColor: line, background: panel }} aria-label={isArabic ? "البحث" : "Search"}>
              <Search size={17} />
              <span className="hidden px-2 text-xs sm:inline">{isArabic ? "ابحث" : "Search"}</span>
            </a>
            <a href={locale === "ar" ? "/en" : "/ar"} className="hidden rounded-full border px-3 py-2 text-[11px] font-bold sm:block" style={{ borderColor: line, background: panel }}>{locale === "ar" ? "EN" : "AR"}</a>
            <button onClick={() => setDark((v) => !v)} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: line, background: panel }} aria-label="Theme">
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <a href={href("/notifications")} className="hidden h-10 w-10 items-center justify-center rounded-full border md:flex" style={{ borderColor: line, background: panel }} aria-label="Notifications"><Bell size={16} /></a>
            {userName ? <a href={href("/account")} className="hidden items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold md:flex" style={{ borderColor: line, background: panel }}><span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `linear-gradient(135deg, ${teal}, ${accent})` }}>{userName.charAt(0).toUpperCase()}</span>{userName}</a> : <a href={href("/auth")} className="rounded-full px-4 py-2 text-xs font-bold" style={{ background: accent, color: bg }}>{isArabic ? "دخول" : "Sign in"}</a>}
          </div>
        </div>
      </header>

      <aside className="fixed bottom-0 start-0 top-[74px] z-40 hidden w-[250px] border-e p-4 lg:block" style={{ borderColor: line, background: dark ? "rgba(9,9,9,.72)" : "rgba(241,233,220,.72)" }}>
        <div className="flex h-full flex-col">
          <div className="space-y-1">
            {mainItems.map(([key, Icon, en, ar, path]) => (
              <a key={key as string} href={href(path as string)} className="group flex items-center gap-3 rounded-2xl px-3 py-3 text-sm transition hover:translate-x-1" style={{ background: active === key ? `${accent}18` : "transparent", color: active === key ? accent : muted }}>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: active === key ? `${accent}22` : "transparent" }}><Icon size={17} /></span>
                <span className="font-semibold">{isArabic ? ar : en}</span>
              </a>
            ))}
          </div>
          <div className="my-5 h-px" style={{ background: line }} />
          <div className="space-y-1">
            <a href={href("/library")} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm" style={{ color: muted }}><span className="flex h-9 w-9 items-center justify-center rounded-xl"><Library size={17} /></span>{isArabic ? "مكتبتي" : "Library"}</a>
            <a href={href("/account/security")} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm" style={{ color: muted }}><span className="flex h-9 w-9 items-center justify-center rounded-xl"><Settings2 size={17} /></span>{isArabic ? "الإعدادات" : "Settings"}</a>
          </div>
          <div className="mt-auto rounded-3xl border p-4" style={{ borderColor: `${teal}99`, background: `linear-gradient(145deg, ${teal}22, ${accent}10)` }}>
            <div className="flex items-center gap-2 text-xs font-bold" style={{ color: accent }}><Sparkles size={14} />{isArabic ? "مساحة للمبدعين" : "For creators"}</div>
            <p className="mt-2 text-xs leading-5" style={{ color: muted }}>{isArabic ? "اعرض أفضل أعمالك في مساحة صُممت حولك." : "Put your best work in a platform designed around creators."}</p>
            <a href={href("/creator")} className="mt-3 inline-flex rounded-full border px-3 py-2 text-xs font-bold" style={{ borderColor: `${accent}55`, color: accent }}>{isArabic ? "ابدأ الإبداع" : "Start creating"}</a>
          </div>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
        <aside className="h-full w-[min(86vw,320px)] border-e p-5" style={{ background: bg, borderColor: line }} onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between"><img src="/RAVINE.png" alt="RAVINE" className="h-11 w-auto" /><button onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full border" style={{ borderColor: line }}><X size={18} /></button></div>
          <div className="mt-8 space-y-1">{mainItems.map(([key, Icon, en, ar, path]) => <a key={key as string} onClick={() => setOpen(false)} href={href(path as string)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm" style={{ background: active === key ? `${accent}18` : "transparent", color: active === key ? accent : muted }}><Icon size={18} />{isArabic ? ar : en}</a>)}</div>
        </aside>
      </div>}

      <main className="lg:ps-[250px]">
        {(title || eyebrow) && <div className="mx-auto max-w-[1440px] px-5 pb-2 pt-10 md:px-8 lg:px-10">
          {eyebrow && <p className="text-[11px] font-bold uppercase tracking-[.26em]" style={{ color: accent }}>{eyebrow}</p>}
          {title && <h1 className="mt-3 text-4xl font-black tracking-[-.035em] md:text-5xl">{title}</h1>}
          {description && <p className="mt-3 max-w-2xl text-sm leading-7" style={{ color: muted }}>{description}</p>}
        </div>}
        {children}
      </main>
    </div>
  );
}

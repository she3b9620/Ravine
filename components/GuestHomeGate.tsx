"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { usePathname } from "next/navigation";
import { CalendarDays, Menu, Moon, PenLine, Play, Search, Star, Sun, UserRound, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import AuthModal from "@/components/AuthModal";

type Props = { children: React.ReactNode };

type Stats = {
  works: number;
  creators: number;
  categories: number;
};

export default function GuestHomeGate({ children }: Props) {
  const locale = useLocale();
  const pathname = usePathname();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
  const [resolved, setResolved] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState<Stats>({ works: 0, creators: 0, categories: 0 });

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ravine-theme");
    if (savedTheme === "light") setDark(false);

    if (!isHome) {
      setResolved(true);
      return;
    }

    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setAuthenticated(Boolean(data.user));
      setResolved(true);

      if (!data.user) {
        const [works, creators, categories] = await Promise.all([
          supabase.from("videos").select("id", { count: "exact", head: true }).eq("published", true),
          supabase.from("creators").select("id", { count: "exact", head: true }),
          supabase.from("categories").select("id", { count: "exact", head: true }),
        ]);
        if (!active) return;
        setStats({
          works: works.count ?? 0,
          creators: creators.count ?? 0,
          categories: categories.count ?? 0,
        });
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setAuthenticated(Boolean(session?.user));
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [isHome, supabase]);

  useEffect(() => {
    if (!isHome || !resolved || authenticated) {
      document.body.style.overflow = "";
      return;
    }

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [authenticated, isHome, resolved]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    window.location.href = `/${locale}/search?q=${encodeURIComponent(query)}`;
  }

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("ravine-theme", next ? "dark" : "light");
  }

  function compact(value: number) {
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M+`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K+`;
    return `${value.toLocaleString()}+`;
  }

  if (!isHome) return <>{children}</>;
  if (!resolved) {
    return <div className="fixed inset-0 z-[9990] bg-[#090909]" aria-hidden="true" />;
  }
  if (authenticated) return <>{children}</>;

  const background = dark ? "#080808" : "#F4EFE7";
  const foreground = dark ? "#FFFFFF" : "#171513";
  const muted = dark ? "rgba(255,255,255,.56)" : "rgba(23,21,19,.55)";
  const gold = "#C89A52";
  const line = dark ? "rgba(255,255,255,.12)" : "rgba(23,21,19,.12)";
  const panel = dark ? "rgba(255,255,255,.035)" : "rgba(255,255,255,.58)";

  const navLinks = [
    { label: isArabic ? "الرئيسية" : "Home", href: `/${locale}` },
    { label: isArabic ? "اكتشف" : "Discover", href: `/${locale}/discover` },
    { label: isArabic ? "المبدعون" : "Creators", href: `/${locale}/creators` },
    { label: isArabic ? "الأعمال" : "Works", href: `/${locale}/videos` },
  ];

  return (
    <div
      dir={isArabic ? "rtl" : "ltr"}
      className="fixed inset-0 z-[9990] overflow-hidden"
      style={{ background: background, color: foreground }}
    >
      <div className="absolute inset-0" aria-hidden="true">
        <div
          className="absolute left-1/2 top-[42%] h-[42rem] w-[42rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: "radial-gradient(circle, rgba(200,154,82,.22) 0%, rgba(200,154,82,.09) 32%, transparent 68%)" }}
        />
        <div className="absolute inset-0 opacity-[.03]" style={{ backgroundImage: "radial-gradient(rgba(255,255,255,.9) .6px, transparent .6px)", backgroundSize: "5px 5px" }} />
      </div>

      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex h-20 max-w-[1500px] items-center gap-3 px-5 md:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex h-11 w-11 items-center justify-center rounded-full border transition hover:scale-105"
            style={{ borderColor: line, background: panel }}
            aria-label={isArabic ? "فتح القائمة" : "Open menu"}
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          <form onSubmit={submitSearch} className="hidden min-w-0 flex-1 sm:block">
            <div className="mx-auto flex max-w-md items-center rounded-full border px-4 py-2" style={{ borderColor: line, background: panel }}>
              <Search size={16} style={{ color: muted }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={isArabic ? "ابحث في RAVINE..." : "Search RAVINE..."}
                className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:opacity-60"
                style={{ color: foreground }}
              />
            </div>
          </form>

          <div className="ms-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAuthOpen(true)}
              className="rounded-full px-5 py-2.5 text-xs font-black transition hover:-translate-y-0.5"
              style={{ background: gold, color: "#0B0B0B" }}
            >
              {isArabic ? "تسجيل الدخول" : "Sign in"}
            </button>
            <a
              href={isArabic ? "/en" : "/ar"}
              className="hidden rounded-full border px-3 py-2 text-[11px] font-bold sm:block"
              style={{ borderColor: line, background: panel }}
            >
              {isArabic ? "ENGLISH" : "العربية"}
            </a>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-10 w-10 items-center justify-center rounded-full border transition hover:scale-105"
              style={{ borderColor: line, background: panel }}
              aria-label={isArabic ? "تغيير المظهر" : "Toggle theme"}
            >
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="absolute inset-0 z-10 bg-black/40 backdrop-blur-md" onClick={() => setMenuOpen(false)}>
          <nav
            className="absolute start-4 top-24 w-[min(88vw,320px)] rounded-[28px] border p-3 shadow-2xl"
            style={{ borderColor: line, background: dark ? "rgba(12,12,12,.96)" : "rgba(248,244,236,.96)" }}
            onClick={(event) => event.stopPropagation()}
          >
            {navLinks.map((item) => (
              <a key={item.href} href={item.href} className="block rounded-2xl px-4 py-3 text-sm font-semibold transition hover:-translate-y-0.5" style={{ color: foreground }}>
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      )}

      <main className="relative z-[1] flex h-full items-center justify-center px-5 pb-28 pt-20 sm:pb-24">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center text-center">
          <div className="mb-7 flex flex-col items-center sm:mb-9">
            <img
              src="/RAVINE.png"
              alt="RAVINE"
              className={`h-auto w-[190px] object-contain transition duration-700 sm:w-[235px] md:w-[275px] ${!dark ? "invert" : ""}`}
              style={{ filter: dark ? "none" : "invert(1)" }}
            />
          </div>

          <div className="max-w-4xl">
            <h1 className="font-ar text-5xl font-black leading-[1.05] tracking-[-.04em] sm:text-6xl md:text-8xl lg:text-[7.2rem]">
              {isArabic ? "حيث تصبح الرؤية سينما" : "Where vision becomes cinema"}
            </h1>
            <p className="mx-auto mt-6 max-w-2xl font-ar text-lg leading-8 sm:text-xl md:text-2xl" style={{ color: muted }}>
              {isArabic
                ? "منصة عالمية لصناع المحتوى البصري الاستثنائي. اكتشف أفلاماً وتصويراً ومؤثرات بصرية فريدة لجوالك."
                : "A global platform for exceptional visual creators. Discover films, photography, and original visual work."}
            </p>

            <div className="mt-9 flex flex-wrap items-center justify-center gap-3 sm:mt-11">
              <a
                href={`/${locale}/discover`}
                className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black transition hover:-translate-y-1 hover:shadow-[0_18px_50px_rgba(200,154,82,.18)]"
                style={{ background: gold, color: "#0B0B0B" }}
              >
                <Play size={15} fill="currentColor" />
                {isArabic ? "استكشف RAVINE" : "Explore RAVINE"}
              </a>
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border px-6 py-3.5 text-sm font-bold transition hover:-translate-y-1"
                style={{ borderColor: line, background: panel, color: foreground }}
              >
                <PenLine size={15} />
                {isArabic ? "ابدأ الإنشاء" : "Start creating"}
              </button>
            </div>
          </div>

          <div className="mt-14 grid w-full max-w-3xl grid-cols-3 border-t pt-6 sm:mt-16" style={{ borderColor: line }}>
            <div className="flex flex-col items-center gap-2 px-2 text-center">
              <CalendarDays size={17} style={{ color: gold }} />
              <strong className="text-xl font-black sm:text-2xl">{compact(stats.works)}</strong>
              <span className="text-[10px] sm:text-xs" style={{ color: muted }}>{isArabic ? "عمل منشور" : "Published works"}</span>
            </div>
            <div className="flex flex-col items-center gap-2 border-x px-2 text-center" style={{ borderColor: line }}>
              <UserRound size={17} style={{ color: gold }} />
              <strong className="text-xl font-black sm:text-2xl">{compact(stats.creators)}</strong>
              <span className="text-[10px] sm:text-xs" style={{ color: muted }}>{isArabic ? "مبدع" : "Creators"}</span>
            </div>
            <div className="flex flex-col items-center gap-2 px-2 text-center">
              <Star size={17} style={{ color: gold }} />
              <strong className="text-xl font-black sm:text-2xl">{compact(stats.categories)}</strong>
              <span className="text-[10px] sm:text-xs" style={{ color: muted }}>{isArabic ? "فئة إبداعية" : "Creative categories"}</span>
            </div>
          </div>
        </div>
      </main>

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
    </div>
  );
}

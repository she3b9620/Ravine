"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
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
  Palette,
  Play,
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

type VideoRecord = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
  created_at?: string | null;
  content_type?: "short" | "video" | "podcast" | "live" | null;
  quality?: "720p" | "1080p" | "2k" | "4k" | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  followers?: number | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

const categoryIcons: Record<string, typeof Film> = {
  cinema: Film,
  gaming: Gamepad2,
  technology: Zap,
  music: Palette,
  education: BookOpen,
  podcast: Mic2,
  documentary: Clapperboard,
  lifestyle: Sparkles,
};

const fallbackCategories: Category[] = [
  { id: 1, name: "Cinema", slug: "cinema" },
  { id: 2, name: "Gaming", slug: "gaming" },
  { id: 3, name: "Technology", slug: "technology" },
  { id: 4, name: "Music", slug: "music" },
  { id: 5, name: "Education", slug: "education" },
  { id: 6, name: "Podcast", slug: "podcast" },
  { id: 7, name: "Documentary", slug: "documentary" },
  { id: 8, name: "Lifestyle", slug: "lifestyle" },
];

const rangeLabels = [
  { key: "day", ar: "اليوم", en: "Today" },
  { key: "week", ar: "الأسبوع", en: "This Week" },
  { key: "month", ar: "الشهر", en: "This Month" },
  { key: "year", ar: "السنة", en: "This Year" },
] as const;

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remaining = seconds % 60;
  if (hours > 0) return `${hours}:${minutes.toString().padStart(2, "0")}:${remaining.toString().padStart(2, "0")}`;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatCount(value: number | null | undefined) {
  const count = Number(value ?? 0);
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toLocaleString();
}

function contentLabel(type: VideoRecord["content_type"], isArabic: boolean) {
  if (type === "short") return isArabic ? "قصير" : "Cut";
  if (type === "podcast") return isArabic ? "بودكاست" : "Podcast";
  if (type === "live") return "LIVE";
  return isArabic ? "عمل" : "Work";
}

export default function HomePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = createClient();

  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(true);
  const [range, setRange] = useState<(typeof rangeLabels)[number]["key"]>("week");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("ravine-theme");
    if (savedTheme === "light") setDark(false);

    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const userResult = await supabase.auth.getUser();
      if (!mounted) return;

      const user = userResult.data.user ?? null;
      setCurrentUser(user);

      if (user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name,username,avatar_url,is_verified")
          .eq("id", user.id)
          .maybeSingle();
        if (!mounted) return;
        setCurrentProfile(profileData ?? null);
      }

      const [videoResult, creatorResult, categoryResult] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,description,thumbnail_url,duration,views,likes,published,created_at,content_type,quality")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(18),
        supabase
          .from("creators")
          .select("id,name,username,avatar_url,bio,followers")
          .order("followers", { ascending: false })
          .limit(8),
        supabase
          .from("categories")
          .select("id,name,slug")
          .order("name", { ascending: true }),
      ]);

      if (!mounted) return;

      const firstError = videoResult.error || creatorResult.error || categoryResult.error;
      if (firstError) setError(firstError.message);
      setVideos(videoResult.data ?? []);
      setCreators(creatorResult.data ?? []);
      setCategories(categoryResult.data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const visibleCategories = useMemo(
    () => (categories.length ? categories.slice(0, 8) : fallbackCategories),
    [categories],
  );

  const heroVideo = videos[0] ?? null;
  const featured = videos.slice(0, 6);
  const liveVideos = videos.filter((video) => video.content_type === "live").slice(0, 4);
  const regularWorks = videos.filter((video) => video.content_type !== "live").slice(0, 8);

  const palette = dark
    ? {
        bg: "#080909",
        surface: "rgba(19, 22, 23, 0.78)",
        surfaceStrong: "#111516",
        text: "#F1E9DC",
        muted: "rgba(241,233,220,.58)",
        soft: "rgba(241,233,220,.035)",
        line: "rgba(241,233,220,.10)",
        copper: "#C47A52",
        olive: "#35452A",
        indigo: "#183F46",
      }
    : {
        bg: "#F4EFE7",
        surface: "rgba(255, 252, 246, .80)",
        surfaceStrong: "#FFFDF8",
        text: "#191716",
        muted: "rgba(25,23,22,.56)",
        soft: "rgba(25,23,22,.035)",
        line: "rgba(25,23,22,.10)",
        copper: "#A86342",
        olive: "#5A6A3A",
        indigo: "#214C55",
      };

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    window.localStorage.setItem("ravine-theme", next ? "dark" : "light");
  }

  function doSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    window.location.href = `/${locale}/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <main
      dir={isArabic ? "rtl" : "ltr"}
      className={`min-h-screen overflow-x-clip ravine-page ${dark ? "ravine-dark" : "ravine-light"}`}
      style={{ background: palette.bg, color: palette.text }}
    >
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
        <div className="ravine-ambient ravine-ambient-one" style={{ background: palette.indigo }} />
        <div className="ravine-ambient ravine-ambient-two" style={{ background: palette.copper }} />
        <div className="ravine-grain" />
      </div>

      <aside
        className={`fixed inset-y-0 z-[70] w-[280px] transform border-e backdrop-blur-2xl transition-transform duration-500 xl:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : isArabic ? "translate-x-full" : "-translate-x-full"
        }`}
        style={{ backgroundColor: dark ? "rgba(9,10,10,.90)" : "rgba(244,239,231,.94)", borderColor: palette.line }}
      >
        <div className="flex h-full flex-col px-5 py-6">
          <div className="flex items-center justify-between">
            <a href={`/${locale}`} className="flex items-center" aria-label="RAVINE home">
              <img src="/RAVINE.png" alt="RAVINE" className={`h-12 w-auto object-contain ${!dark ? "invert" : ""}`} />
            </a>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-2 xl:hidden"
              style={{ backgroundColor: palette.soft, color: palette.muted }}
              aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}
            >
              <X size={18} />
            </button>
          </div>

          <div className="mt-9 space-y-2">
            {[
              [Home, isArabic ? "الرئيسية" : "Home", `/${locale}`],
              [Compass, isArabic ? "اكتشف" : "Discover", `/${locale}/search`],
              [Video, isArabic ? "الفيديوهات" : "Videos", `/${locale}/videos`],
              [Sparkles, isArabic ? "القصات" : "Cuts", `/${locale}/shorts`],
              [Mic2, isArabic ? "البودكاست" : "Podcasts", `/${locale}/podcasts`],
              [Zap, isArabic ? "مباشر الآن" : "Live Now", `/${locale}/live`],
            ].map(([Icon, label, href]) => (
              <a
                key={String(label)}
                href={String(href)}
                className="ravine-nav-item flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition"
                style={{ color: palette.muted }}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </div>

          <div className="my-6 h-px" style={{ backgroundColor: palette.line }} />

          <div className="space-y-2">
            <p className="px-4 text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: palette.muted }}>
              {isArabic ? "مكتبتك" : "Your space"}
            </p>
            {[
              [Library, isArabic ? "المكتبة" : "Library", `/${locale}/library`],
              [Users, isArabic ? "المتابَعون" : "Following", `/${locale}/search?view=following`],
              [Bell, isArabic ? "النشاط" : "Activity", `/${locale}/notifications`],
            ].map(([Icon, label, href]) => (
              <a key={String(label)} href={String(href)} className="ravine-nav-item flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" style={{ color: palette.muted }}>
                <Icon size={18} strokeWidth={1.8} />
                <span>{label}</span>
              </a>
            ))}
          </div>

          <div className="mt-auto">
            <div className="mb-3 rounded-3xl border p-4" style={{ background: palette.soft, borderColor: palette.line }}>
              <div className="flex items-start gap-3">
                <div className="mt-0.5 rounded-xl p-2" style={{ backgroundColor: `${palette.copper}18`, color: palette.copper }}>
                  <Sparkles size={16} />
                </div>
                <div>
                  <p className="text-sm font-bold">{isArabic ? "كن مبدعًا" : "Become a Creator"}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: palette.muted }}>
                    {isArabic ? "حوّل ملفك إلى مساحة إبداعية احترافية." : "Turn your profile into a professional creative space."}
                  </p>
                  <a href={`/${locale}/creator`} className="mt-3 inline-flex items-center text-xs font-bold" style={{ color: palette.copper }}>
                    {isArabic ? "ابدأ الآن" : "Start now"} <ArrowUpRight size={13} className="ms-1" />
                  </a>
                </div>
              </div>
            </div>
            <a href={`/${locale}/settings`} className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm" style={{ color: palette.muted }}>
              <Settings2 size={18} />
              <span>{isArabic ? "الإعدادات" : "Settings"}</span>
            </a>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-[60] bg-black/45 backdrop-blur-sm xl:hidden"
          aria-label={isArabic ? "إغلاق" : "Close"}
        />
      )}

      <div className="relative z-10 xl:ps-[280px]">
        <header
          className="sticky top-0 z-50 border-b backdrop-blur-2xl"
          style={{ backgroundColor: dark ? "rgba(8,9,9,.72)" : "rgba(244,239,231,.78)", borderColor: palette.line }}
        >
          <div className="mx-auto flex h-[76px] max-w-[1560px] items-center gap-3 px-4 md:px-7">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-full border p-2.5 xl:hidden"
              style={{ borderColor: palette.line, backgroundColor: palette.soft }}
              aria-label={isArabic ? "فتح القائمة" : "Open menu"}
            >
              <Menu size={18} />
            </button>

            <a href={`/${locale}`} className="xl:hidden">
              <img src="/RAVINE.png" alt="RAVINE" className={`h-10 w-auto ${!dark ? "invert" : ""}`} />
            </a>

            <form onSubmit={doSearch} className="ms-auto flex-1 sm:max-w-xl xl:mx-auto">
              <div className="flex items-center rounded-full border px-4 py-1.5" style={{ backgroundColor: palette.surface, borderColor: palette.line }}>
                <Search size={17} style={{ color: palette.muted }} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isArabic ? "ابحث عن عمل، مبدع، تصنيف..." : "Search works, creators, categories..."}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ color: palette.text }}
                />
              </div>
            </form>

            <div className="ms-auto flex items-center gap-2 xl:ms-0">
              <a href={isArabic ? "/en" : "/ar"} className="hidden rounded-full border px-3 py-2 text-[11px] font-bold sm:block" style={{ borderColor: palette.line, backgroundColor: palette.soft }}>
                {isArabic ? "EN" : "AR"}
              </a>
              <button type="button" onClick={toggleTheme} className="rounded-full border p-2.5" style={{ borderColor: palette.line, backgroundColor: palette.soft }} aria-label={isArabic ? "تغيير المظهر" : "Toggle theme"}>
                {dark ? <Sun size={17} /> : <Moon size={17} />}
              </button>
              {currentUser && (
                <a href={`/${locale}/notifications`} className="hidden rounded-full border p-2.5 md:block" style={{ borderColor: palette.line, backgroundColor: palette.soft }}>
                  <Bell size={17} />
                </a>
              )}
              {currentUser ? (
                <a href={`/${locale}/account`} className="flex items-center gap-2 rounded-full border px-2 py-1.5" style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
                  <img src={currentProfile?.avatar_url || "/RAVINE.png"} alt="" className="h-7 w-7 rounded-full object-cover" />
                  <span className="hidden max-w-28 truncate text-xs font-semibold sm:block">{currentProfile?.display_name || currentProfile?.username || "Account"}</span>
                </a>
              ) : (
                <a href={`/${locale}/auth`} className="rounded-full px-4 py-2.5 text-xs font-bold" style={{ backgroundColor: palette.copper, color: dark ? palette.bg : "#fff8ee" }}>
                  {isArabic ? "دخول" : "Sign In"}
                </a>
              )}
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-[1560px] px-4 pb-16 md:px-7">
          <section className="relative pt-8 md:pt-10">
            <div className="ravine-hero-shell relative min-h-[620px] overflow-hidden rounded-[34px] border md:min-h-[700px]" style={{ borderColor: palette.line, backgroundColor: palette.surfaceStrong }}>
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: heroVideo?.thumbnail_url
                    ? `linear-gradient(90deg, ${palette.bg} 2%, ${palette.bg}cf 38%, transparent 72%), linear-gradient(0deg, ${palette.bg} 0%, transparent 55%), url(${heroVideo.thumbnail_url})`
                    : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_28%,rgba(196,122,82,.22),transparent_30%),radial-gradient(circle_at_80%_78%,rgba(24,63,70,.45),transparent_36%)]" />

              <div className="relative flex min-h-[620px] max-w-2xl flex-col justify-end p-7 md:min-h-[700px] md:p-12">
                <div className="ravine-kicker inline-flex w-fit items-center gap-2 rounded-full border px-3 py-2 text-[10px] font-bold uppercase tracking-[.22em]" style={{ borderColor: `${palette.copper}55`, backgroundColor: `${palette.bg}92`, color: palette.copper }}>
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ backgroundColor: palette.copper }} />
                  {isArabic ? "اختيار RAVINE" : "RAVINE FEATURE"}
                </div>

                <h1 className="mt-5 max-w-xl text-5xl font-black leading-[.98] tracking-[-.05em] md:text-7xl">
                  {isArabic ? "حيث تصبح الرؤية سينما." : "Where vision becomes cinema."}
                </h1>
                <p className="mt-5 max-w-lg text-sm leading-7 md:text-base" style={{ color: palette.muted }}>
                  {isArabic
                    ? "اكتشف أعمالًا اختارها صناعها بعناية، وقدّم أفضل ما لديك في مساحة تضع العمل قبل الضوضاء."
                    : "Discover carefully crafted work, and give your best ideas a home where craft comes before noise."}
                </p>

                {heroVideo && (
                  <div className="mt-7 flex flex-wrap items-center gap-3">
                    <a href={`/${locale}/watch/${heroVideo.id}`} className="group inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ backgroundColor: palette.copper, color: dark ? palette.bg : "#fff8ee" }}>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full" style={{ backgroundColor: "rgba(0,0,0,.14)" }}>
                        <Play size={13} fill="currentColor" />
                      </span>
                      {isArabic ? "شاهد العمل" : "Watch feature"}
                      <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </a>
                    <a href={`/${locale}/search`} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: palette.line, backgroundColor: `${palette.bg}88` }}>
                      {isArabic ? "استكشف RAVINE" : "Explore RAVINE"}
                    </a>
                  </div>
                )}

                <div className="mt-8 flex flex-wrap gap-3 text-[11px]" style={{ color: palette.muted }}>
                  <span>{isArabic ? "سينما" : "Cinema"}</span>
                  <span>•</span>
                  <span>{isArabic ? "مبدعون" : "Creators"}</span>
                  <span>•</span>
                  <span>{isArabic ? "مجتمع" : "Community"}</span>
                  <span>•</span>
                  <span>{isArabic ? "تجربة 4K" : "4K-ready experience"}</span>
                </div>
              </div>

              <div className="absolute bottom-5 end-5 hidden w-[280px] rounded-3xl border p-4 backdrop-blur-xl md:block" style={{ borderColor: palette.line, backgroundColor: `${palette.bg}b8` }}>
                <p className="text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: palette.muted }}>{isArabic ? "هذا الأسبوع" : "This week"}</p>
                <div className="mt-3 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-3xl font-black">{formatCount(videos.length)}</p>
                    <p className="mt-1 text-xs" style={{ color: palette.muted }}>{isArabic ? "أعمال معروضة" : "published works"}</p>
                  </div>
                  <div className="rounded-2xl px-3 py-2" style={{ backgroundColor: `${palette.copper}16`, color: palette.copper }}>
                    <Sparkles size={17} />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-14">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: palette.copper }}>{isArabic ? "المحتوى الرائج" : "TRENDING"}</span>
                <h2 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{isArabic ? "ما يلفت الأنظار الآن" : "What’s turning heads"}</h2>
              </div>
              <div className="flex w-fit items-center gap-1 rounded-full border p-1" style={{ backgroundColor: palette.soft, borderColor: palette.line }}>
                {rangeLabels.map((item) => {
                  const active = item.key === range;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setRange(item.key)}
                      className="rounded-full px-3.5 py-2 text-[11px] font-bold transition md:px-4"
                      style={{ backgroundColor: active ? palette.text : "transparent", color: active ? palette.bg : palette.muted }}
                    >
                      {isArabic ? item.ar : item.en}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {(loading ? Array.from({ length: 4 }) : featured.slice(0, 4)).map((video, index) => (
                <article key={video?.id ?? `trend-${index}`} className="ravine-card group overflow-hidden rounded-[26px] border" style={{ backgroundColor: palette.surface, borderColor: palette.line }}>
                  {loading ? (
                    <div className="aspect-[16/10] animate-pulse" style={{ backgroundColor: palette.soft }} />
                  ) : (
                    <a href={`/${locale}/watch/${video.id}`} className="block">
                      <div className="relative aspect-[16/10] overflow-hidden">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.05]" />
                        ) : (
                          <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${palette.indigo}, ${palette.copper})` }} />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/0 to-black/0" />
                        <div className="absolute start-3 top-3 rounded-full border px-2.5 py-1 text-[9px] font-bold uppercase tracking-[.15em]" style={{ backgroundColor: "rgba(0,0,0,.48)", borderColor: "rgba(255,255,255,.12)", color: "#fff" }}>
                          {contentLabel(video.content_type, isArabic)}
                        </div>
                        <span className="absolute bottom-3 end-3 rounded-full bg-black/60 px-2 py-1 text-[10px] font-bold text-white">{formatDuration(video.duration)}</span>
                      </div>
                    </a>
                  )}
                  {!loading && (
                    <div className="p-4">
                      <h3 className="line-clamp-2 text-sm font-bold leading-6">{video.title}</h3>
                      <div className="mt-3 flex items-center justify-between text-[11px]" style={{ color: palette.muted }}>
                        <span>{formatCount(video.views)} {isArabic ? "مشاهدة" : "views"}</span>
                        <span>{formatCount(video.likes)} {isArabic ? "إعجاب" : "likes"}</span>
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </section>

          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: palette.copper }}>{isArabic ? "الاختيارات" : "THE CURATED SHELF"}</span>
                <h2 className="mt-2 text-3xl font-black md:text-4xl">{isArabic ? "أعمال تستحق المشاهدة" : "Works worth staying for"}</h2>
              </div>
              <a href={`/${locale}/search`} className="hidden items-center gap-1 text-xs font-bold sm:flex" style={{ color: palette.copper }}>
                {isArabic ? "عرض الكل" : "View all"} <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
              <div className="grid gap-5 sm:grid-cols-2">
                {regularWorks.slice(0, 4).map((video, index) => (
                  <a key={video.id} href={`/${locale}/watch/${video.id}`} className={`ravine-feature-card group relative overflow-hidden rounded-[28px] border ${index === 0 ? "sm:col-span-2" : ""}`} style={{ borderColor: palette.line, backgroundColor: palette.surfaceStrong }}>
                    <div className={`${index === 0 ? "aspect-[16/8]" : "aspect-[16/11]"} overflow-hidden`}>
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" /> : <div className="h-full w-full" style={{ background: `linear-gradient(135deg, ${palette.olive}, ${palette.indigo})` }} />}
                    </div>
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent p-5 pt-20 text-white">
                      <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[.2em] text-white/65">
                        <span>{contentLabel(video.content_type, isArabic)}</span><span>•</span><span>{video.quality ?? "4K"}</span>
                      </div>
                      <h3 className="mt-2 text-lg font-bold leading-6 md:text-xl">{video.title}</h3>
                      <p className="mt-1 text-xs text-white/65">{formatCount(video.views)} {isArabic ? "مشاهدة" : "views"}</p>
                    </div>
                  </a>
                ))}
              </div>

              <div className="rounded-[28px] border p-5" style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: palette.copper }}>{isArabic ? "أفكار جديدة" : "DISCOVER"}</span>
                    <h3 className="mt-2 text-xl font-black">{isArabic ? "اعثر على زاويتك" : "Find your angle"}</h3>
                  </div>
                  <Compass size={22} style={{ color: palette.copper }} />
                </div>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {visibleCategories.slice(0, 8).map((category) => {
                    const Icon = categoryIcons[category.slug] || Sparkles;
                    return (
                      <a key={category.id} href={`/${locale}/search?q=${encodeURIComponent(category.name)}`} className="group rounded-2xl border p-3 transition hover:-translate-y-0.5" style={{ borderColor: palette.line, backgroundColor: palette.soft }}>
                        <Icon size={17} />
                        <p className="mt-4 text-xs font-semibold">{category.name}</p>
                        <div className="mt-2 h-px w-0 transition-all duration-300 group-hover:w-full" style={{ backgroundColor: palette.copper }} />
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: palette.copper }}>{isArabic ? "صُنّاع المنصة" : "CREATORS"}</span>
                <h2 className="mt-2 text-3xl font-black md:text-4xl">{isArabic ? "أسماء تستحق أن تُعرف" : "Meet the people behind the work"}</h2>
              </div>
              <a href={`/${locale}/search?view=creators`} className="hidden items-center gap-1 text-xs font-bold sm:flex" style={{ color: palette.copper }}>
                {isArabic ? "كل المبدعين" : "All creators"} <ArrowUpRight size={14} />
              </a>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {(loading ? Array.from({ length: 4 }) : creators.slice(0, 4)).map((creator, index) => (
                <a key={creator?.id ?? `creator-${index}`} href={creator ? `/${locale}/creator/${creator.username || creator.id}` : `/${locale}/creators`} className="ravine-creator-card group rounded-[26px] border p-5 transition" style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
                  {loading ? (
                    <div className="mx-auto h-20 w-20 animate-pulse rounded-full" style={{ backgroundColor: palette.soft }} />
                  ) : (
                    <>
                      <div className="mx-auto relative h-20 w-20 overflow-hidden rounded-full border-2" style={{ borderColor: `${palette.copper}55`, backgroundColor: palette.soft }}>
                        {creator.avatar_url ? <img src={creator.avatar_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="flex h-full w-full items-center justify-center text-xl font-black">{creator.name?.charAt(0)}</div>}
                      </div>
                      <div className="mt-4 text-center">
                        <h3 className="text-sm font-bold">{creator.name}</h3>
                        <p className="mt-1 text-xs" style={{ color: palette.muted }}>@{creator.username || "creator"}</p>
                        <div className="mt-4 flex items-center justify-center gap-2 text-[10px]" style={{ color: palette.muted }}>
                          <span>{formatCount(creator.followers)} {isArabic ? "متابع" : "followers"}</span>
                          <span>•</span>
                          <span>{isArabic ? "مبدع" : "Creator"}</span>
                        </div>
                      </div>
                    </>
                  )}
                </a>
              ))}
            </div>
          </section>

          {liveVideos.length > 0 && (
            <section className="mt-16">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#E35B51" }}>
                    <span className="h-2 w-2 animate-pulse rounded-full" style={{ backgroundColor: "#E35B51" }} /> LIVE
                  </span>
                  <h2 className="mt-2 text-3xl font-black md:text-4xl">{isArabic ? "مباشر الآن" : "Live now"}</h2>
                </div>
                <a href={`/${locale}/live`} className="hidden items-center gap-1 text-xs font-bold sm:flex" style={{ color: palette.copper }}>
                  {isArabic ? "كل البثوث" : "All live"} <ArrowUpRight size={14} />
                </a>
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {liveVideos.map((video) => (
                  <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group relative min-h-[220px] overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(227,91,81,.26)", backgroundColor: palette.surfaceStrong }}>
                    {video.thumbnail_url && <img src={video.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-700 group-hover:scale-[1.03]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent" />
                    <div className="relative flex h-full min-h-[220px] flex-col justify-between p-5 text-white">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-[#E35B51] px-3 py-1.5 text-[9px] font-black uppercase tracking-[.15em]">LIVE</span>
                        <span className="rounded-full bg-black/35 px-3 py-1.5 text-[9px] font-semibold">{isArabic ? "بث مباشر" : "Live stream"}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold">{video.title}</h3>
                        <div className="mt-2 flex items-center gap-2 text-xs text-white/65">
                          <span>{formatCount(video.views)} {isArabic ? "مشاهد" : "watching"}</span>
                          <span>•</span>
                          <span>{isArabic ? "صانع محتوى" : "Creator"}</span>
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}

          <section className="mt-16 grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
            <div className="relative overflow-hidden rounded-[32px] border p-7 md:p-10" style={{ borderColor: palette.line, background: `radial-gradient(circle at 75% 20%, ${palette.indigo}55, transparent 34%), ${palette.surfaceStrong}` }}>
              <div className="absolute end-[-6rem] top-[-5rem] h-56 w-56 rounded-full blur-3xl" style={{ backgroundColor: `${palette.copper}15` }} />
              <div className="relative max-w-xl">
                <span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: palette.copper }}>{isArabic ? "مجتمع RAVINE" : "RAVINE COMMUNITY"}</span>
                <h2 className="mt-3 text-3xl font-black md:text-4xl">{isArabic ? "المحتوى يبدأ من العمل… ويكبر بالمجتمع." : "The work starts it. The community carries it."}</h2>
                <p className="mt-4 text-sm leading-7" style={{ color: palette.muted }}>
                  {isArabic
                    ? "ناقش، اكتشف، شارك، وتعاون مع ناس يشوفوا الصورة بنفس الطريقة — ومبدعين عندهم شغف حقيقي."
                    : "Discover, discuss, share and collaborate with people who care about the craft as much as you do."}
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <a href={`/${locale}/community`} className="rounded-full px-5 py-3 text-sm font-bold" style={{ backgroundColor: palette.text, color: palette.bg }}>
                    {isArabic ? "ادخل المجتمع" : "Enter community"}
                  </a>
                  <a href={`/${locale}/creators-hub`} className="rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: palette.line }}>
                    {isArabic ? "Creators Hub" : "Creators Hub"}
                  </a>
                </div>
              </div>
            </div>

            <div className="rounded-[32px] border p-7" style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${palette.copper}16`, color: palette.copper }}>
                <Sparkles size={20} />
              </div>
              <h3 className="mt-5 text-xl font-black">{isArabic ? "عمل اليوم" : "Work of the day"}</h3>
              <p className="mt-2 text-sm leading-6" style={{ color: palette.muted }}>
                {isArabic ? "اختيار تحريري يتغير يوميًا ليعرّفك على عمل قد يفوتك في الزحام." : "A daily editorial pick designed to surface something the feed could easily miss."}
              </p>
              <a href={`/${locale}/search?select=today`} className="mt-6 inline-flex items-center text-xs font-bold" style={{ color: palette.copper }}>
                {isArabic ? "شاهد الاختيار" : "See today’s pick"} <ArrowUpRight size={14} className="ms-1" />
              </a>
            </div>
          </section>

          {error && (
            <div className="mt-6 rounded-2xl border px-4 py-3 text-xs" style={{ borderColor: `${palette.copper}35`, backgroundColor: `${palette.copper}0c`, color: palette.muted }}>
              {isArabic ? "تعذر تحميل جزء من المحتوى، لكن الواجهة ما زالت تعمل." : "Some content could not be loaded, but the interface is still available."}
            </div>
          )}
        </div>

        <footer className="border-t" style={{ borderColor: palette.line }}>
          <div className="mx-auto flex max-w-[1560px] flex-col gap-6 px-4 py-10 md:px-7 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <img src="/RAVINE.png" alt="RAVINE" className={`h-9 w-auto ${!dark ? "invert" : ""}`} />
              <p className="mt-3 max-w-md text-xs leading-6" style={{ color: palette.muted }}>
                {isArabic ? "منصة عالمية للمبدعين البصريين — عربية الأصل، فلسطينية الروح، وسينمائية التجربة." : "A global home for visual creators — Arabic at heart, Palestinian in spirit, cinematic by design."}
              </p>
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-3 text-xs" style={{ color: palette.muted }}>
              <a href={`/${locale}/search`}>Discover</a>
              <a href={`/${locale}/creators`}>Creators</a>
              <a href={`/${locale}/community`}>Community</a>
              <a href={`/${locale}/live`}>Live</a>
              <a href={`/${locale}/settings`}>Settings</a>
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

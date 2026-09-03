"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Bell,
  Clapperboard,
  Cpu,
  Film,
  Gamepad2,
  GraduationCap,
  Library,
  Mic2,
  Music2,
  Search,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type Category = {
  id: number;
  name: string;
  slug: string;
};

const icons: Record<string, typeof Film> = {
  cinema: Film,
  gaming: Gamepad2,
  technology: Cpu,
  music: Music2,
  education: GraduationCap,
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

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) return "—";
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

function formatViews(value: number | null) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function HomePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = createClient();

  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentProfile, setCurrentProfile] = useState<any>(null);
  const [search, setSearch] = useState("");
  const [dark, setDark] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
          .select("id,title,description,thumbnail_url,duration,views,likes,published")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(12),
        supabase
          .from("creators")
          .select("id,name,username,avatar_url,bio")
          .order("id", { ascending: true })
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
  const featured = videos.slice(0, 6);
  const heroVideo = videos[0] ?? null;

  const bg = dark ? "#080909" : "#F1E9DC";
  const panel = dark ? "rgba(18,20,21,.82)" : "rgba(248,244,236,.9)";
  const text = dark ? "#F1E9DC" : "#111111";
  const muted = dark ? "rgba(241,233,220,.56)" : "rgba(17,17,17,.56)";
  const line = dark ? "rgba(241,233,220,.10)" : "rgba(17,17,17,.10)";
  const copper = "#C47A52";
  const teal = "#183F46";

  function doSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    if (!query) return;
    window.location.href = `/${locale}/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen" style={{ backgroundColor: bg, color: text }}>
      <header
        className="sticky top-0 z-50 border-b backdrop-blur-2xl"
        style={{ backgroundColor: dark ? "rgba(8,9,9,.84)" : "rgba(241,233,220,.84)", borderColor: line }}
      >
        <div className="mx-auto flex h-[78px] max-w-[1440px] items-center justify-between gap-5 px-5 md:px-8 lg:px-10">
          <a href={`/${locale}`} className="flex items-center gap-3" aria-label="RAVINE home">
            <img src="/RAVINE.png" alt="RAVINE" className={`h-12 w-auto object-contain ${dark ? "" : "invert"}`} />
          </a>

          <nav className="hidden items-center gap-8 text-sm lg:flex">
            <a href={`/${locale}`} className="font-semibold">{isArabic ? "الرئيسية" : "Home"}</a>
            <a href="#discover" style={{ color: muted }}>{isArabic ? "اكتشف" : "Discover"}</a>
            <a href="#categories" style={{ color: muted }}>{isArabic ? "التصنيفات" : "Categories"}</a>
            <a href="#creators" style={{ color: muted }}>{isArabic ? "المبدعون" : "Creators"}</a>
          </nav>

          <div className="flex items-center gap-2">
            <form onSubmit={doSearch} className="hidden sm:block">
              <div className="flex items-center rounded-full border px-3" style={{ backgroundColor: panel, borderColor: line }}>
                <Search size={16} style={{ color: muted }} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={isArabic ? "ابحث في RAVINE..." : "Search RAVINE..."}
                  className="w-36 bg-transparent px-3 py-2 text-sm outline-none md:w-44"
                  style={{ color: text }}
                />
              </div>
            </form>
            <a href={isArabic ? "/en" : "/ar"} className="rounded-full border px-3 py-2 text-xs font-semibold" style={{ backgroundColor: panel, borderColor: line }}>
              {isArabic ? "EN" : "AR"}
            </a>
            <button type="button" onClick={() => setDark((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full border text-sm" style={{ backgroundColor: panel, borderColor: line }} aria-label="Toggle theme">
              {dark ? "☀" : "☾"}
            </button>
            {currentUser && (
              <a href={`/${locale}/notifications`} className="hidden rounded-full border p-2.5 sm:block" style={{ borderColor: line }} aria-label="Notifications">
                <Bell size={17} />
              </a>
            )}
            {currentUser ? (
              <a href={`/${locale}/account`} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ backgroundColor: panel, borderColor: line }}>
                <img src={currentProfile?.avatar_url || "/RAVINE.png"} alt="" className="h-7 w-7 rounded-full object-cover" />
                <span className="hidden max-w-28 truncate sm:block">{currentProfile?.display_name || currentProfile?.username || currentUser.email?.split("@")[0] || "Account"}</span>
                {currentProfile?.is_verified && <span style={{ color: copper }}>✓</span>}
              </a>
            ) : (
              <a href={`/${locale}/auth`} className="rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: copper, color: bg }}>
                {isArabic ? "دخول" : "Sign In"}
              </a>
            )}
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden border-b" style={{ borderColor: line }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-12rem] h-[38rem] w-[38rem] -translate-x-1/2 rounded-full blur-[140px]" style={{ background: "rgba(196,122,82,.16)" }} />
          <div className="absolute right-[-8rem] top-10 h-[30rem] w-[30rem] rounded-full blur-[130px]" style={{ background: "rgba(24,63,70,.70)" }} />
          <div className="absolute left-[-10rem] bottom-0 h-[22rem] w-[22rem] rounded-full blur-[120px]" style={{ background: "rgba(196,122,82,.10)" }} />
          <div className="absolute inset-x-0 bottom-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${copper}66, transparent)` }} />
        </div>

        <div className="relative mx-auto flex min-h-[720px] max-w-[1440px] flex-col items-center justify-center px-5 py-20 text-center md:min-h-[820px] md:px-8">
          <div className="mb-10 flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.32em]" style={{ color: muted }}>
            <span className="h-px w-10" style={{ backgroundColor: line }} />
            {isArabic ? "منصة للمبدعين" : "A PLATFORM FOR CREATORS"}
            <span className="h-px w-10" style={{ backgroundColor: line }} />
          </div>

          <div className="relative">
            <div className="absolute left-1/2 top-1/2 h-[18rem] w-[18rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[85px]" style={{ background: "rgba(24,63,70,.42)" }} />
            <img src="/RAVINE.png" alt="RAVINE" className={`relative mx-auto w-[min(78vw,600px)] object-contain ${dark ? "" : "invert"}`} />
          </div>

          <p className="mt-5 text-[12px] font-semibold uppercase tracking-[.38em]" style={{ color: muted }}>
            {isArabic ? "اصنع • شارك • اكتشف" : "CREATE • SHARE • DISCOVER"}
          </p>

          <h1 className="mt-8 max-w-4xl text-4xl font-black leading-[1.04] tracking-[-.045em] md:text-6xl lg:text-7xl">
            {isArabic ? "مساحة للأصوات الأصلية." : "A place for original voices."}
          </h1>
          <p className="mt-6 max-w-2xl text-sm leading-7 md:text-base" style={{ color: muted }}>
            {isArabic
              ? "منصة تجمع الفيديو، المجتمع، والمبدعين في تجربة واحدة هادئة ومميزة."
              : "A cinematic home for videos, communities, and creators — built to feel considered, not crowded."}
          </p>

          <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
            <a href={heroVideo ? `/${locale}/watch/${heroVideo.id}` : `/${locale}/search`} className="rounded-full px-6 py-3 text-sm font-bold" style={{ backgroundColor: copper, color: bg }}>
              {isArabic ? "ابدأ الاكتشاف" : "Start discovering"}
              <ArrowUpRight className="ms-2 inline-block" size={16} />
            </a>
            <a href={`/${locale}/creator`} className="rounded-full border px-6 py-3 text-sm font-semibold" style={{ borderColor: line, backgroundColor: panel }}>
              {isArabic ? "ابدأ كصانع" : "Create on RAVINE"}
            </a>
          </div>

          <div className="mt-12 grid w-full max-w-3xl grid-cols-2 gap-3 md:grid-cols-4">
            {visibleCategories.slice(0, 4).map((category) => {
              const Icon = icons[category.slug] || Sparkles;
              return (
                <a key={category.id} href={`/${locale}/search?q=${encodeURIComponent(category.name)}`} className="group rounded-2xl border px-4 py-4 text-start transition duration-300 hover:-translate-y-1" style={{ borderColor: line, backgroundColor: panel }}>
                  <div className="flex items-center justify-between">
                    <Icon size={18} strokeWidth={1.8} />
                    <ArrowUpRight size={15} className="opacity-40 transition group-hover:opacity-100" />
                  </div>
                  <p className="mt-5 text-sm font-semibold">{category.name}</p>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="discover" className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-10">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[.3em]" style={{ color: muted }}>{isArabic ? "الآن على RAVINE" : "NOW ON RAVINE"}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{isArabic ? "ماذا يحدث الآن" : "What's happening"}</h2>
          </div>
          <a href={`/${locale}/search`} className="text-sm font-semibold" style={{ color: copper }}>{isArabic ? "عرض الكل" : "View all"} <ArrowUpRight className="ms-1 inline" size={15} /></a>
        </div>

        {error && <div className="mb-7 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-2xl border" style={{ backgroundColor: panel, borderColor: line }}><div className="aspect-video animate-pulse" style={{ backgroundColor: `${teal}55` }} /><div className="space-y-3 p-5"><div className="h-4 w-4/5 animate-pulse rounded" style={{ backgroundColor: `${teal}44` }} /><div className="h-3 w-2/5 animate-pulse rounded" style={{ backgroundColor: `${teal}33` }} /></div></div>)}
          </div>
        ) : featured.length === 0 ? (
          <div className="rounded-3xl border p-10 text-sm" style={{ backgroundColor: panel, borderColor: line, color: muted }}>{isArabic ? "لا يوجد محتوى منشور حاليًا." : "No published content yet."}</div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {featured.map((video, index) => (
              <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-2xl border transition duration-300 hover:-translate-y-1" style={{ backgroundColor: panel, borderColor: line }}>
                <div className="relative aspect-video overflow-hidden" style={{ backgroundColor: teal }}>
                  <img src={video.thumbnail_url || "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200"} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent opacity-80" />
                  <span className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/50 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white">{String(index + 1).padStart(2, "0")}</span>
                  {video.duration ? <span className="absolute bottom-4 right-4 rounded bg-black/75 px-2 py-1 text-[11px] font-medium text-white">{formatDuration(video.duration)}</span> : null}
                </div>
                <div className="p-5">
                  <h3 className="line-clamp-2 text-lg font-bold leading-6">{video.title}</h3>
                  <p className="mt-3 text-xs" style={{ color: muted }}>{formatViews(video.views)} views · {Number(video.likes ?? 0).toLocaleString()} likes</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </section>

      <section id="categories" className="border-y" style={{ borderColor: line, backgroundColor: dark ? "rgba(24,63,70,.22)" : "rgba(24,63,70,.06)" }}>
        <div className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-10">
          <div className="max-w-xl">
            <span className="text-[11px] font-bold uppercase tracking-[.3em]" style={{ color: muted }}>{isArabic ? "اتبع فضولك" : "FOLLOW YOUR CURIOSITY"}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{isArabic ? "تصفح حسب اهتمامك" : "Explore by interest"}</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4">
            {visibleCategories.map((category) => {
              const Icon = icons[category.slug] || Sparkles;
              return <a key={category.id} href={`/${locale}/search?q=${encodeURIComponent(category.name)}`} className="group flex min-h-[132px] flex-col justify-between rounded-2xl border p-5 transition duration-300 hover:-translate-y-1" style={{ backgroundColor: panel, borderColor: line }}><Icon size={23} strokeWidth={1.6} /><div className="flex items-end justify-between gap-3"><span className="text-sm font-bold">{category.name}</span><ArrowUpRight size={16} className="opacity-35 transition group-hover:opacity-100" /></div></a>;
            })}
          </div>
        </div>
      </section>

      <section id="creators" className="mx-auto max-w-[1440px] px-5 py-20 md:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-5">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-[.3em]" style={{ color: muted }}>{isArabic ? "وجوه المنصة" : "FACES OF RAVINE"}</span>
            <h2 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">{isArabic ? "مبدعون يستحقون الاكتشاف" : "Creators worth discovering"}</h2>
          </div>
        </div>

        {creators.length === 0 ? (
          <div className="mt-10 rounded-3xl border p-10 text-sm" style={{ backgroundColor: panel, borderColor: line, color: muted }}>{isArabic ? "لا يوجد مبدعون حاليًا." : "No creators yet."}</div>
        ) : (
          <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4">
            {creators.map((creator) => (
              <a key={creator.id} href={`/${locale}/creator/${creator.username || creator.id}`} className="group rounded-2xl border p-5 transition duration-300 hover:-translate-y-1" style={{ backgroundColor: panel, borderColor: line }}>
                <div className="flex items-start justify-between"><img src={creator.avatar_url || "/RAVINE.png"} alt={creator.name} className="h-16 w-16 rounded-full object-cover" /><ArrowUpRight size={16} className="opacity-35 transition group-hover:opacity-100" /></div>
                <h3 className="mt-5 text-sm font-bold">{creator.name}</h3>
                {creator.username && <p className="mt-1 text-xs" style={{ color: muted }}>@{creator.username}</p>}
                {creator.bio && <p className="mt-3 line-clamp-2 text-xs leading-5" style={{ color: muted }}>{creator.bio}</p>}
              </a>
            ))}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-8 lg:px-10">
        <div className="relative overflow-hidden rounded-[2rem] border p-8 md:p-12 lg:p-16" style={{ background: dark ? "linear-gradient(120deg,#101214,#183F46)" : "linear-gradient(120deg,#E8E2D8,#F8F4EC)", borderColor: line }}>
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full blur-[110px]" style={{ background: "rgba(196,122,82,.25)" }} />
          <div className="relative max-w-3xl">
            <span className="text-[11px] font-bold uppercase tracking-[.3em]" style={{ color: dark ? "rgba(241,233,220,.62)" : muted }}>{isArabic ? "مساحتك تبدأ هنا" : "YOUR SPACE STARTS HERE"}</span>
            <h2 className="mt-4 text-3xl font-black tracking-tight md:text-5xl">{isArabic ? "اصنع شيئًا يستحق أن يُكتشف." : "Make something worth finding."}</h2>
            <p className="mt-5 max-w-2xl text-sm leading-7" style={{ color: dark ? "rgba(241,233,220,.60)" : muted }}>{isArabic ? "أنشئ قناتك، شارك أعمالك، وابنِ مجتمعك على منصة صُممت للمحتوى الذي له معنى." : "Create your channel, share your work, and build a community on a platform designed for content with a point of view."}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={`/${locale}/creator`} className="rounded-full px-6 py-3 text-sm font-bold" style={{ backgroundColor: copper, color: bg }}>{isArabic ? "أنشئ قناتك" : "Create your channel"}</a>
              <a href={`/${locale}/library`} className="rounded-full border px-6 py-3 text-sm font-semibold" style={{ borderColor: dark ? "rgba(241,233,220,.18)" : line }}>{isArabic ? "مكتبتي" : "Open library"}</a>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t" style={{ borderColor: line }}>
        <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-8 lg:px-10">
          <div className="flex items-center gap-4"><img src="/RAVINE.png" alt="RAVINE" className={`h-9 w-auto object-contain ${dark ? "" : "invert"}`} /><span className="text-xs" style={{ color: muted }}>© 2026 RAVINE</span></div>
          <div className="flex items-center gap-5 text-xs" style={{ color: muted }}><a href={`/${locale}/library`}><Library className="me-1 inline" size={14} />{isArabic ? "المكتبة" : "Library"}</a><a href={`/${locale}/creator`}>{isArabic ? "المبدعون" : "Creators"}</a><a href={`/${locale}/auth`}>{isArabic ? "الحساب" : "Account"}</a></div>
        </div>
      </footer>
    </main>
  );
}

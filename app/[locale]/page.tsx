"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Film,
  Gamepad2,
  Headphones,
  Play,
  Search,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import PlatformShell from "@/components/PlatformShell";
import { createClient } from "@/lib/supabase/client";

type VideoRecord = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
  creator_id: number | null;
  category_id: number | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
  published: boolean | null;
  quality: "720p" | "1080p" | "2k" | "4k" | null;
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

const categoryIcons = [Film, Gamepad2, Video, Headphones, Sparkles, Users];

const fallbackCategories: Category[] = [
  { id: 0, name: "Cinema", slug: "cinema" },
  { id: 0, name: "Gaming", slug: "gaming" },
  { id: 0, name: "Technology", slug: "technology" },
  { id: 0, name: "Podcasts", slug: "podcasts" },
  { id: 0, name: "Documentary", slug: "documentary" },
  { id: 0, name: "Music", slug: "music" },
];

const copy = {
  en: {
    eyebrow: "RAVINE / ORIGINAL WORK",
    title: "A home for work worth discovering.",
    description: "A creator-first space for cinematic work, original voices, and the people behind them.",
    search: "Search work or creators...",
    explore: "Explore the work",
    latest: "Latest work",
    latestDesc: "Freshly published work from the RAVINE scene.",
    all: "View all",
    categories: "Explore by discipline",
    categoriesDesc: "Follow the kind of work you care about.",
    creators: "People shaping the scene",
    creatorsDesc: "Meet creators through the work they make.",
    community: "Start with the work. Stay for the people behind it.",
    communityDesc: "RAVINE connects work, credits, creators, and conversation in one place.",
    communityButton: "Enter community",
    empty: "No published work yet.",
    tryAgain: "Try a different search.",
  },
  ar: {
    eyebrow: "RAVINE / أعمال أصلية",
    title: "مساحة للأعمال التي تستحق أن تُكتشف.",
    description: "مساحة مخصصة للمبدعين، للأعمال البصرية، وللأصوات التي تستحق أن تجد جمهورها.",
    search: "ابحث عن عمل أو مبدع...",
    explore: "اكتشف الأعمال",
    latest: "أحدث الأعمال",
    latestDesc: "أعمال نُشرت حديثًا من مشهد RAVINE.",
    all: "عرض الكل",
    categories: "اكتشف حسب المجال",
    categoriesDesc: "تابع النوع من الأعمال الذي يهمك.",
    creators: "أشخاص يصنعون المشهد",
    creatorsDesc: "تعرّف على المبدعين من خلال أعمالهم.",
    community: "ابدأ من العمل، ثم تعرّف على من يقف خلفه.",
    communityDesc: "RAVINE يربط العمل بالمبدعين والـCredits والحوار في مساحة واحدة.",
    communityButton: "ادخل المجتمع",
    empty: "لا توجد أعمال منشورة بعد.",
    tryAgain: "جرّب بحثًا مختلفًا.",
  },
};

function formatViews(value: number | null, locale: string) {
  return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value ?? 0);
}

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "";
  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

export default function HomePage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const t = isArabic ? copy.ar : copy.en;
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHome() {
      setLoading(true);
      setError("");

      const [videoResult, categoryResult, creatorResult] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,description,thumbnail_url,duration,views,likes,created_at,creator_id,category_id,content_type,published,quality")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(18),
        supabase.from("categories").select("id,name,slug").order("name", { ascending: true }).limit(12),
        supabase.from("creators").select("id,name,username,avatar_url,bio").order("followers", { ascending: false }).limit(6),
      ]);

      if (!mounted) return;

      if (videoResult.error) setError(videoResult.error.message);
      if (categoryResult.error && !videoResult.error) setError(categoryResult.error.message);
      if (creatorResult.error && !videoResult.error && !categoryResult.error) setError(creatorResult.error.message);

      setVideos((videoResult.data ?? []) as VideoRecord[]);
      setCategories((categoryResult.data ?? []) as Category[]);
      setCreators((creatorResult.data ?? []) as Creator[]);
      setLoading(false);
    }

    void loadHome();
    return () => { mounted = false; };
  }, [supabase]);

  const filteredVideos = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return videos;
    return videos.filter((video) => {
      const title = video.title?.toLowerCase() ?? "";
      const description = video.description?.toLowerCase() ?? "";
      return title.includes(term) || description.includes(term);
    });
  }, [videos, query]);

  const featured = filteredVideos[0] ?? null;
  const latest = filteredVideos.slice(1, 9);
  const visibleCategories = categories.length ? categories.slice(0, 6) : fallbackCategories;

  return (
    <PlatformShell>
      <div className="ravine-home-page">
        <section className="mx-auto max-w-[1440px] px-5 pb-14 pt-12 md:px-8 lg:px-10 lg:pt-16">
          <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative min-h-[460px] overflow-hidden rounded-[32px] border bg-[#111516] p-7 md:p-10">
              {featured?.thumbnail_url ? (
                <img src={featured.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
              ) : (
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(196,122,82,.30),transparent_26%),linear-gradient(135deg,#183F46,#111516_56%,#090909)]" />
              )}
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,9,.96),rgba(9,9,9,.62),rgba(9,9,9,.12))]" />
              <div className="relative z-10 flex min-h-[390px] max-w-2xl flex-col justify-end">
                <p className="text-[10px] font-bold uppercase tracking-[.26em] text-[#C47A52]">{t.eyebrow}</p>
                <h2 className="mt-4 max-w-xl text-4xl font-black leading-[1.02] tracking-[-.04em] md:text-6xl">{featured?.title || t.title}</h2>
                <p className="mt-5 max-w-xl text-sm leading-7 text-[#F1E9DC]/65">{featured?.description || t.description}</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href={`/${locale}/discover`} className="inline-flex items-center gap-2 rounded-full bg-[#C47A52] px-5 py-3 text-sm font-bold text-[#090909]"><Play size={15} fill="currentColor" />{t.explore}<ArrowUpRight size={15} /></Link>
                  {featured && <Link href={`/${locale}/watch/${featured.id}`} className="inline-flex items-center gap-2 rounded-full border border-[#F1E9DC]/15 bg-[#090909]/35 px-5 py-3 text-sm font-semibold text-[#F1E9DC]">{isArabic ? "شاهد العمل المميز" : "Watch featured work"}</Link>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="rounded-[28px] border bg-[#151719]/75 p-5">
                <label className="flex items-center gap-3 rounded-2xl border border-[#F1E9DC]/10 bg-[#090909]/40 px-4 py-3">
                  <Search size={18} className="shrink-0 opacity-60" />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} className="w-full bg-transparent text-sm outline-none placeholder:text-[#F1E9DC]/35" />
                </label>
                <div className="mt-5 grid gap-3 grid-cols-2">
                  <Link href={`/${locale}/discover`} className="rounded-2xl border border-[#F1E9DC]/10 bg-[#183F46]/35 p-4"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C47A52]">Discover</div><div className="mt-2 text-sm font-bold">{isArabic ? "استكشف المشهد" : "Explore the scene"}</div></Link>
                  <Link href={`/${locale}/creators`} className="rounded-2xl border border-[#F1E9DC]/10 bg-[#151719] p-4"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#C47A52]">Creators</div><div className="mt-2 text-sm font-bold">{isArabic ? "اعرف المبدعين" : "Meet creators"}</div></Link>
                </div>
              </div>
              <div className="flex-1 rounded-[28px] border bg-[#151719]/55 p-6">
                <div className="flex items-center gap-2 text-xs font-bold text-[#C47A52]"><Sparkles size={15} />{isArabic ? "إشارة RAVINE" : "RAVINE signal"}</div>
                <p className="mt-5 text-2xl font-black leading-snug">{t.community}</p>
                <p className="mt-4 text-sm leading-7 text-[#F1E9DC]/55">{t.communityDesc}</p>
                <Link href={`/${locale}/community`} className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-[#C47A52]">{t.communityButton}<ArrowUpRight size={14} /></Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-16 md:px-8 lg:px-10">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#C47A52]">{isArabic ? "الجديد" : "Fresh"}</p><h2 className="mt-2 text-3xl font-black tracking-[-.03em]">{t.latest}</h2><p className="mt-2 text-sm text-[#F1E9DC]/45">{t.latestDesc}</p></div><Link href={`/${locale}/videos`} className="text-xs font-bold text-[#C47A52]">{t.all}</Link></div>
          {error && <div className="mb-5 rounded-2xl border border-[#C47A52]/20 bg-[#C47A52]/[.06] px-4 py-3 text-xs text-[#F1E9DC]/65">{error}</div>}
          {loading ? (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-[28px] border border-[#F1E9DC]/10 bg-[#151719]/60" />)}</div>
          ) : latest.length === 0 ? (
            <div className="rounded-[28px] border border-[#F1E9DC]/10 bg-[#151719]/55 p-10 text-center"><p className="text-lg font-bold">{query ? t.tryAgain : t.empty}</p></div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {latest.map((video) => (
                <Link key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-[26px] border border-[#F1E9DC]/10 bg-[#151719]/72">
                  <div className="relative aspect-video overflow-hidden bg-[#183F46]">
                    {video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" /> : <div className="h-full w-full bg-[linear-gradient(135deg,#183F46,#111516)]" />}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                    {video.duration && <span className="absolute bottom-3 end-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white">{formatDuration(video.duration)}</span>}
                    <span className="absolute top-3 start-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[.12em] text-white">{video.content_type || "work"}</span>
                  </div>
                  <div className="p-4"><h3 className="line-clamp-2 text-sm font-bold leading-6">{video.title}</h3><div className="mt-4 flex items-center justify-between text-[10px] text-[#F1E9DC]/45"><span>{formatViews(video.views, locale)} {isArabic ? "مشاهدة" : "views"}</span><span>{video.quality || ""}</span></div></div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-16 md:px-8 lg:px-10">
          <div className="mb-6"><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#C47A52]">{isArabic ? "المشهد" : "The scene"}</p><h2 className="mt-2 text-3xl font-black">{t.categories}</h2><p className="mt-2 text-sm text-[#F1E9DC]/45">{t.categoriesDesc}</p></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {visibleCategories.map((category, index) => { const Icon = categoryIcons[index % categoryIcons.length]; return <Link key={`${category.slug}-${index}`} href={`/${locale}/discover?category=${encodeURIComponent(category.slug)}`} className="group min-h-[132px] rounded-[22px] border border-[#F1E9DC]/10 bg-[#151719]/55 p-4 transition hover:border-[#C47A52]/30 hover:bg-[#C47A52]/[.04]"><div className="grid size-10 place-items-center rounded-xl border border-[#F1E9DC]/10 bg-[#183F46]/35 text-[#C47A52]"><Icon size={18} /></div><div className="mt-8 flex items-end justify-between gap-2"><span className="text-xs font-bold">{category.name}</span><ArrowUpRight size={14} className="text-[#C47A52] opacity-50 transition group-hover:opacity-100" /></div></Link>; })}
          </div>
        </section>

        <section className="mx-auto max-w-[1440px] px-5 pb-20 md:px-8 lg:px-10">
          <div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em] text-[#C47A52]">{isArabic ? "المبدعون" : "Creators"}</p><h2 className="mt-2 text-3xl font-black">{t.creators}</h2><p className="mt-2 text-sm text-[#F1E9DC]/45">{t.creatorsDesc}</p></div><Link href={`/${locale}/creators`} className="text-xs font-bold text-[#C47A52]">{t.all}</Link></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {creators.map((creator) => <Link key={creator.id} href={`/${locale}/creator/${creator.username || creator.id}`} className="flex items-center gap-4 rounded-[22px] border border-[#F1E9DC]/10 bg-[#151719]/50 p-4 transition hover:border-[#C47A52]/25"><div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-[#183F46]">{creator.avatar_url ? <img src={creator.avatar_url} alt={creator.name} className="size-full object-cover" /> : <span className="text-sm font-bold">{creator.name.charAt(0).toUpperCase()}</span>}</div><div className="min-w-0"><div className="truncate text-sm font-bold">{creator.name}</div><div className="mt-1 truncate text-[10px] text-[#F1E9DC]/45">@{creator.username || "creator"}</div></div><ArrowUpRight size={15} className="ms-auto text-[#C47A52]" /></Link>)}
          </div>
          {!loading && creators.length === 0 && <div className="rounded-[22px] border border-[#F1E9DC]/10 bg-[#151719]/45 p-8 text-center text-sm text-[#F1E9DC]/45">{isArabic ? "لا يوجد مبدعون متاحون بعد." : "No creators available yet."}</div>}
        </section>
      </div>
    </PlatformShell>
  );
}

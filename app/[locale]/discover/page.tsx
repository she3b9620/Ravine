"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Grid2X2, List, Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
  quality: "720p" | "1080p" | "2k" | "4k" | null;
};

type Category = { id: number; name: string; slug: string };
type Sort = "latest" | "views" | "likes";
type Range = "all" | "today" | "week" | "month" | "year";

const fallbackCategories: Category[] = [
  { id: 1, name: "Cinema", slug: "cinema" },
  { id: 2, name: "Photography", slug: "photography" },
  { id: 3, name: "Editing", slug: "editing" },
  { id: 4, name: "Motion", slug: "motion" },
  { id: 5, name: "Documentary", slug: "documentary" },
  { id: 6, name: "Gaming", slug: "gaming" },
  { id: 7, name: "Technology", slug: "technology" },
  { id: 8, name: "Music", slug: "music" },
];

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}` : `${mins}:${secs.toString().padStart(2, "0")}`;
}

function since(range: Range) {
  const now = Date.now();
  const days = range === "today" ? 1 : range === "week" ? 7 : range === "month" ? 30 : range === "year" ? 365 : 0;
  return days ? new Date(now - days * 86400000).toISOString() : null;
}

export default function DiscoverPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);

  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [range, setRange] = useState<Range>("all");
  const [category, setCategory] = useState("all");
  const [type, setType] = useState("all");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const visibleCategories = categories.length ? categories : fallbackCategories;

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError("");
      let request = supabase
        .from("videos")
        .select("id,title,description,thumbnail_url,duration,views,likes,created_at,content_type,quality")
        .eq("published", true);

      const createdAfter = since(range);
      if (createdAfter) request = request.gte("created_at", createdAfter);
      if (category !== "all") request = request.eq("category_id", Number(category));
      if (type !== "all") request = request.eq("content_type", type);

      const term = query.trim();
      if (term) {
        const [titleResult, descriptionResult] = await Promise.all([
          request.ilike("title", `%${term}%`),
          request.ilike("description", `%${term}%`),
        ]);
        if (!mounted) return;
        if (titleResult.error || descriptionResult.error) {
          setError(titleResult.error?.message || descriptionResult.error?.message || "Search failed.");
          setVideos([]);
        } else {
          const merged = [...(titleResult.data ?? []), ...(descriptionResult.data ?? [])];
          const unique = Array.from(new Map(merged.map((item) => [item.id, item])).values());
          const sorted = [...unique].sort((a, b) => {
            if (sort === "views") return Number(b.views ?? 0) - Number(a.views ?? 0);
            if (sort === "likes") return Number(b.likes ?? 0) - Number(a.likes ?? 0);
            return new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime();
          });
          setVideos(sorted.slice(0, 60) as Video[]);
        }
      } else {
        request = sort === "views"
          ? request.order("views", { ascending: false })
          : sort === "likes"
            ? request.order("likes", { ascending: false })
            : request.order("created_at", { ascending: false });
        const videoResult = await request.limit(60);
        if (!mounted) return;
        if (videoResult.error) {
          setError(videoResult.error.message);
          setVideos([]);
        } else {
          setVideos((videoResult.data ?? []) as Video[]);
        }
      }

      const categoryResult = await supabase.from("categories").select("id,name,slug").order("name", { ascending: true });
      if (!mounted) return;
      if (categoryResult.error) setError((current) => current || categoryResult.error.message);
      setCategories((categoryResult.data ?? []) as Category[]);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [query, sort, range, category, type, supabase]);

  const copy = useMemo(() => ({
    eyebrow: isArabic ? "اكتشف الأعمال" : "DISCOVER THE WORK",
    title: isArabic ? "مساحة أوسع لاكتشاف ما يستحق المشاهدة." : "A deeper way to discover work worth watching.",
    description: isArabic ? "ابحث وفلتر وتصفح أعمال RAVINE بالطريقة التي تناسب ذوقك." : "Search, filter, and explore RAVINE by the things that matter to you.",
  }), [isArabic]);

  const rangeItems: [Range, string][] = [
    ["all", isArabic ? "الكل" : "All"],
    ["today", isArabic ? "اليوم" : "Today"],
    ["week", isArabic ? "هذا الأسبوع" : "This week"],
    ["month", isArabic ? "هذا الشهر" : "This month"],
    ["year", isArabic ? "هذا العام" : "This year"],
  ];

  return (
    <PlatformShell active="discover" eyebrow={copy.eyebrow} title={copy.title} description={copy.description}>
      <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
        <div className="rounded-[28px] border p-3 backdrop-blur-xl" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.68)" }}>
          <div className="flex flex-col gap-3 lg:flex-row">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border px-4 py-3" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(9,9,9,.42)" }}>
              <Search size={18} className="shrink-0 opacity-60" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={isArabic ? "ابحث عن عمل، مبدع، أو فكرة..." : "Search work, creators, or ideas..."} className="w-full bg-transparent text-sm outline-none" />
            </label>
            <div className="flex items-center gap-2">
              <button onClick={() => setView("grid")} className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: view === "grid" ? "#C47A52" : "rgba(241,233,220,.08)", background: view === "grid" ? "rgba(196,122,82,.12)" : "transparent" }} aria-label="Grid"><Grid2X2 size={17} /></button>
              <button onClick={() => setView("list")} className="flex h-11 w-11 items-center justify-center rounded-2xl border" style={{ borderColor: view === "list" ? "#C47A52" : "rgba(241,233,220,.08)", background: view === "list" ? "rgba(196,122,82,.12)" : "transparent" }} aria-label="List"><List size={17} /></button>
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {rangeItems.map(([value, label]) => <button key={value} onClick={() => setRange(value)} className="whitespace-nowrap rounded-full border px-4 py-2 text-xs font-semibold transition" style={{ borderColor: range === value ? "rgba(196,122,82,.45)" : "rgba(241,233,220,.08)", background: range === value ? "rgba(196,122,82,.14)" : "transparent", color: range === value ? "#C47A52" : "inherit" }}>{label}</button>)}
          </div>
          <div className="mt-3 grid gap-2 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-2xl border px-3" style={{ borderColor: "rgba(241,233,220,.08)" }}><SlidersHorizontal size={15} className="opacity-50" /><select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full bg-transparent py-3 text-sm outline-none"><option value="all">{isArabic ? "كل التصنيفات" : "All categories"}</option>{visibleCategories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
            <select value={type} onChange={(e) => setType(e.target.value)} className="rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }}><option value="all">{isArabic ? "كل أنواع المحتوى" : "All content"}</option><option value="short">{isArabic ? "شورتس" : "Cuts"}</option><option value="video">{isArabic ? "فيديوهات" : "Videos"}</option><option value="podcast">{isArabic ? "بودكاست" : "Podcasts"}</option></select>
            <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="rounded-2xl border bg-transparent px-3 py-3 text-sm outline-none" style={{ borderColor: "rgba(241,233,220,.08)" }}><option value="latest">{isArabic ? "الأحدث" : "Latest"}</option><option value="views">{isArabic ? "الأكثر مشاهدة" : "Most viewed"}</option><option value="likes">{isArabic ? "الأكثر إعجاباً" : "Most liked"}</option></select>
          </div>
        </div>
        {error && <div className="mt-6 rounded-3xl border border-red-500/20 bg-red-500/10 p-5 text-sm text-red-100">{error}</div>}
        {loading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3"><div className="h-72 animate-pulse rounded-3xl bg-white/5" /><div className="h-72 animate-pulse rounded-3xl bg-white/5" /><div className="h-72 animate-pulse rounded-3xl bg-white/5" /></div>
        ) : videos.length === 0 ? (
          <div className="mt-8 rounded-[28px] border p-10 text-center" style={{ borderColor: "rgba(24,63,70,.7)", background: "rgba(21,23,25,.6)" }}><Sparkles className="mx-auto opacity-60" size={28} /><h2 className="mt-4 text-xl font-bold">{isArabic ? "لسه مفيش أعمال مطابقة" : "No matching work yet"}</h2><p className="mt-2 text-sm opacity-50">{isArabic ? "جرّب كلمة بحث أو فلتر مختلف." : "Try a different search or filter."}</p></div>
        ) : (
          <div className={view === "grid" ? "mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3" : "mt-8 space-y-4"}>
            {videos.map((video) => (
              <a key={video.id} href={`/${locale}/watch/${video.id}`} className={view === "grid" ? "group overflow-hidden rounded-[28px] border transition duration-500 hover:-translate-y-1 hover:shadow-2xl" : "group flex flex-col gap-4 overflow-hidden rounded-[28px] border p-4 transition duration-500 hover:-translate-y-0.5 md:flex-row"} style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.70)" }}>
                <div className={view === "grid" ? "relative aspect-video overflow-hidden bg-[#183F46]" : "relative aspect-video shrink-0 overflow-hidden rounded-2xl bg-[#183F46] md:w-72"}>
                  <img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                  <span className="absolute bottom-3 end-3 rounded-full bg-black/75 px-2.5 py-1 text-[10px] font-semibold text-white">{durationLabel(video.duration)}</span>
                  {video.quality && <span className="absolute bottom-3 start-3 rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white">{video.quality}</span>}
                </div>
                <div className="min-w-0 p-5 md:p-0 md:pt-1">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "#C47A52" }}>{video.content_type || "work"}</div>
                  <h2 className="mt-2 line-clamp-2 text-lg font-bold leading-7">{video.title}</h2>
                  <p className="mt-2 line-clamp-2 text-xs leading-5 opacity-50">{video.description}</p>
                  <div className="mt-4 flex items-center gap-3 text-xs opacity-50"><span>{Number(video.views || 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"}</span><span>•</span><span>{Number(video.likes || 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}</span></div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}

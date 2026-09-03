"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  created_at?: string | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function SearchPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const params = useSearchParams();
  const query = (params.get("q") || "").trim();

  const [videos, setVideos] = useState<Video[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    const timer = window.setTimeout(() => {
      async function search() {
        setLoading(true);
        setError("");

        if (!query) {
          setVideos([]);
          setCreators([]);
          setLoading(false);
          return;
        }

        const [videoTitle, videoDescription, creatorName, creatorUsername] = await Promise.all([
          supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,created_at").eq("published", true).ilike("title", `%${query}%`).limit(24),
          supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,created_at").eq("published", true).ilike("description", `%${query}%`).limit(24),
          supabase.from("creators").select("id,name,username,avatar_url,bio").ilike("name", `%${query}%`).limit(12),
          supabase.from("creators").select("id,name,username,avatar_url,bio").ilike("username", `%${query}%`).limit(12),
        ]);

        if (!mounted) return;

        const firstError = videoTitle.error || videoDescription.error || creatorName.error || creatorUsername.error;
        if (firstError) {
          setError(firstError.message || (isArabic ? "تعذر تنفيذ البحث." : "Search failed."));
          setVideos([]);
          setCreators([]);
          setLoading(false);
          return;
        }

        const mergedVideos = Array.from(
          new Map([...videoTitle.data ?? [], ...videoDescription.data ?? []].map((item) => [item.id, item])).values(),
        ).sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()).slice(0, 24);

        const mergedCreators = Array.from(
          new Map([...creatorName.data ?? [], ...creatorUsername.data ?? []].map((item) => [item.id, item])).values(),
        ).slice(0, 12);

        setVideos(mergedVideos as Video[]);
        setCreators(mergedCreators as Creator[]);
        setLoading(false);
      }
      void search();
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(timer);
    };
  }, [query, isArabic, supabase]);

  function duration(seconds: number | null) {
    if (!seconds || seconds <= 0) return "—";
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${remaining.toString().padStart(2, "0")}`;
  }

  const copy = useMemo(() => ({
    eyebrow: "RAVINE SEARCH",
    title: query
      ? isArabic ? `نتائج البحث عن «${query}»` : `Results for “${query}”`
      : isArabic ? "ابحث في RAVINE" : "Search RAVINE",
    searchPlaceholder: isArabic ? "ابحث في RAVINE..." : "Search RAVINE...",
    search: isArabic ? "بحث" : "Search",
    videos: isArabic ? "الفيديوهات" : "Videos",
    creators: isArabic ? "المبدعون" : "Creators",
    noVideos: isArabic ? "لا توجد فيديوهات مطابقة." : "No matching videos.",
    noCreators: isArabic ? "لا يوجد مبدعون مطابقون." : "No matching creators.",
    back: isArabic ? "العودة إلى RAVINE" : "Back to RAVINE",
  }), [isArabic, query]);

  return (
    <main dir={isArabic ? "rtl" : "ltr"} className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">{copy.eyebrow}</div>
            <h1 className="mt-3 text-4xl font-black">{copy.title}</h1>
          </div>
          <form action={`/${locale}/search`} className="flex w-full max-w-md gap-2">
            <input name="q" defaultValue={query} placeholder={copy.searchPlaceholder} className="min-w-0 flex-1 rounded-2xl border border-[#F1E9DC]/10 bg-[#151719] px-4 py-3 text-sm outline-none focus:border-[#C47A52]" />
            <button type="submit" className="rounded-2xl bg-[#C47A52] px-5 py-3 text-sm font-bold text-[#090909]">{copy.search}</button>
          </form>
        </div>

        {error && <div className="mt-8 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">{error}</div>}

        {loading ? (
          <div className="mt-10 text-sm text-[#F1E9DC]/50">{isArabic ? "جارٍ البحث..." : "Searching..."}</div>
        ) : (
          <>
            <section className="mt-10">
              <div className="mb-5"><h2 className="text-2xl font-bold">{copy.videos}</h2></div>
              {videos.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">{copy.noVideos}</div>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {videos.map((video) => (
                    <a key={video.id} href={`/${locale}/watch/${video.id}`} className="overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719] transition hover:-translate-y-1 hover:border-[#C47A52]/40">
                      <div className="relative aspect-video overflow-hidden bg-[#183F46]">
                        <img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover" />
                        <span className="absolute bottom-3 end-3 rounded bg-black/80 px-2 py-1 text-xs text-white">{duration(video.duration)}</span>
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold leading-6">{video.title}</h3>
                        <p className="mt-2 text-xs text-[#F1E9DC]/40">{(video.views ?? 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"} · {(video.likes ?? 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </section>

            <section className="mt-12">
              <div className="mb-5"><h2 className="text-2xl font-bold">{copy.creators}</h2></div>
              {creators.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">{copy.noCreators}</div>
              ) : (
                <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                  {creators.map((creator) => (
                    <a key={creator.id} href={`/${locale}/creator/${creator.username || creator.id}`} className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 transition hover:-translate-y-1 hover:border-[#C47A52]/40">
                      <img src={creator.avatar_url || "/RAVINE.png"} alt={creator.name} className="h-20 w-20 rounded-full object-cover" />
                      <h3 className="mt-4 font-bold">{creator.name}</h3>
                      {creator.username && <p className="mt-1 text-xs text-[#C47A52]">@{creator.username}</p>}
                      {creator.bio && <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#F1E9DC]/50">{creator.bio}</p>}
                    </a>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        <a href={`/${locale}`} className="mt-10 inline-block text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]">← {copy.back}</a>
      </div>
    </main>
  );
}

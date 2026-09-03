"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import PlatformShell from "@/components/PlatformShell";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
};

type HistoryItem = {
  video_id: number;
  progress_seconds: number;
  completed: boolean;
  last_watched_at: string;
  videos: Video | null;
};

export default function LibraryPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"saved" | "history" | "liked">("saved");
  const [videos, setVideos] = useState<Video[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setVideos([]);
      setHistory([]);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/auth?next=/${locale}/library`;
        return;
      }

      if (tab === "saved") {
        const { data, error: loadError } = await supabase
          .from("video_saves")
          .select(`video_id, videos (id, title, thumbnail_url, duration, views, likes)`)
          .eq("user_id", user.id);

        if (cancelled) return;
        if (loadError) setError(loadError.message);
        else setVideos((data ?? []).map((row: any) => row.videos).filter(Boolean));
      }

      if (tab === "liked") {
        const { data, error: loadError } = await supabase
          .from("video_likes")
          .select(`video_id, videos (id, title, thumbnail_url, duration, views, likes)`)
          .eq("user_id", user.id);

        if (cancelled) return;
        if (loadError) setError(loadError.message);
        else setVideos((data ?? []).map((row: any) => row.videos).filter(Boolean));
      }

      if (tab === "history") {
        const { data, error: loadError } = await supabase
          .from("watch_history")
          .select(`video_id, progress_seconds, completed, last_watched_at, videos (id, title, thumbnail_url, duration, views, likes)`)
          .eq("user_id", user.id)
          .order("last_watched_at", { ascending: false });

        if (cancelled) return;
        if (loadError) setError(loadError.message);
        else setHistory((data ?? []) as unknown as HistoryItem[]);
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [locale, supabase, tab]);

  function duration(seconds: number | null) {
    if (!seconds || seconds <= 0) return "—";
    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;
    return `${minutes}:${remaining.toString().padStart(2, "0")}`;
  }

  const tabs = [
    ["saved", isArabic ? "المحفوظات" : "Saved"],
    ["history", isArabic ? "سجل المشاهدة" : "Watch History"],
    ["liked", isArabic ? "المعجب بها" : "Liked Videos"],
  ] as const;

  return (
    <PlatformShell
      active=""
      eyebrow={isArabic ? "مكتبتي" : "Library"}
      title={isArabic ? "كل ما اخترت الاحتفاظ به." : "Everything you chose to keep."}
      description={isArabic ? "محفوظاتك، سجل المشاهدة، والأعمال التي تركت فيها إعجابك — في مكان واحد." : "Your saved work, watch history, and liked pieces in one focused space."}
    >
      <div className="mx-auto max-w-[1440px] px-5 pb-16 pt-8 md:px-8 lg:px-10">
        <div className="flex flex-wrap gap-2 border-b pb-5" style={{ borderColor: "rgba(241,233,220,.08)" }}>
          {tabs.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className="rounded-full border px-5 py-2.5 text-sm font-bold transition"
              style={{
                background: tab === value ? "#C47A52" : "transparent",
                color: tab === value ? "#090909" : "rgba(241,233,220,.60)",
                borderColor: tab === value ? "#C47A52" : "rgba(241,233,220,.10)",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.28)", background: "rgba(196,122,82,.08)", color: "rgba(241,233,220,.72)" }}>
            {isArabic ? "تعذر تحميل المكتبة حاليًا." : "The library could not be loaded right now."}
          </div>
        )}

        {loading ? (
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-[24px] border" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.55)" }}>
                <div className="aspect-video animate-pulse" style={{ background: "rgba(241,233,220,.04)" }} />
                <div className="space-y-3 p-4"><div className="h-4 animate-pulse rounded-full" style={{ background: "rgba(241,233,220,.05)" }} /><div className="h-3 w-2/3 animate-pulse rounded-full" style={{ background: "rgba(241,233,220,.04)" }} /></div>
              </div>
            ))}
          </div>
        ) : tab === "history" ? (
          <div className="mt-8 space-y-4">
            {history.length === 0 ? (
              <div className="border-y py-10 text-sm" style={{ borderColor: "rgba(241,233,220,.08)", color: "rgba(241,233,220,.50)" }}>{isArabic ? "سجل المشاهدة فارغ." : "Your watch history is empty."}</div>
            ) : history.map((row) => {
              const video = row.videos;
              if (!video) return null;
              const progress = video.duration && video.duration > 0 ? Math.min(100, (row.progress_seconds / video.duration) * 100) : 0;
              return (
                <a key={`${video.id}-${row.last_watched_at}`} href={`/${locale}/watch/${video.id}`} className="group grid gap-5 border-b pb-5 md:grid-cols-[260px_1fr]" style={{ borderColor: "rgba(241,233,220,.08)" }}>
                  <div className="relative aspect-video overflow-hidden rounded-[20px]" style={{ background: "#183F46" }}>
                    <img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  </div>
                  <div className="min-w-0 py-1">
                    <h2 className="text-xl font-bold leading-7">{video.title}</h2>
                    <p className="mt-2 text-xs" style={{ color: "rgba(241,233,220,.42)" }}>{row.completed ? (isArabic ? "مكتمل" : "Completed") : `${isArabic ? "استئناف من" : "Resume at"} ${duration(row.progress_seconds)}`}</p>
                    <div className="mt-6 h-1 overflow-hidden rounded-full" style={{ background: "rgba(241,233,220,.08)" }}><div className="h-full" style={{ width: `${progress}%`, background: "#C47A52" }} /></div>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {videos.length === 0 ? (
              <div className="border-y py-10 text-sm" style={{ borderColor: "rgba(241,233,220,.08)", color: "rgba(241,233,220,.50)" }}>{isArabic ? "لا يوجد شيء هنا حتى الآن." : "Nothing here yet."}</div>
            ) : videos.map((video) => (
              <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group block">
                <div className="aspect-video overflow-hidden rounded-[20px]" style={{ background: "#183F46" }}><img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /></div>
                <div className="pt-4"><h2 className="line-clamp-2 text-sm font-bold leading-6">{video.title}</h2><p className="mt-2 text-[11px]" style={{ color: "rgba(241,233,220,.42)" }}>{(video.views ?? 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"} · {(video.likes ?? 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}</p></div>
              </a>
            ))}
          </div>
        )}
      </div>
    </PlatformShell>
  );
}

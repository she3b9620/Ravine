"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
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

  const [tab, setTab] = useState<
    "saved" | "history" | "liked"
  >("saved");

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
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/auth?next=/${locale}/library`;
        return;
      }

      if (tab === "saved") {
        const { data, error: loadError } = await supabase
          .from("video_saves")
          .select(`
            video_id,
            videos (
              id,
              title,
              thumbnail_url,
              duration,
              views,
              likes
            )
          `)
          .eq("user_id", user.id);

        if (cancelled) return;
        if (loadError) {
          setError(loadError.message);
        } else {
          setVideos(
            (data ?? [])
              .map((row: any) => row.videos)
              .filter(Boolean)
          );
        }
      }

      if (tab === "liked") {
        const { data, error: loadError } = await supabase
          .from("video_likes")
          .select(`
            video_id,
            videos (
              id,
              title,
              thumbnail_url,
              duration,
              views,
              likes
            )
          `)
          .eq("user_id", user.id);

        if (loadError) {
          setError(loadError.message);
        } else {
          setVideos(
            (data ?? [])
              .map((row: any) => row.videos)
              .filter(Boolean)
          );
        }
      }

      if (tab === "history") {
        const { data, error: loadError } = await supabase
          .from("watch_history")
          .select(`
            video_id,
            progress_seconds,
            completed,
            last_watched_at,
            videos (
              id,
              title,
              thumbnail_url,
              duration,
              views,
              likes
            )
          `)
          .eq("user_id", user.id)
          .order("last_watched_at", {
            ascending: false
          });

        if (loadError) {
          setError(loadError.message);
        } else {
          setHistory(
            (data ?? []) as unknown as HistoryItem[]
          );
        }
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => { cancelled = true; };
  }, [locale, supabase, tab]);

  function duration(seconds: number | null) {
    if (!seconds || seconds <= 0) return "—";

    const minutes = Math.floor(seconds / 60);
    const remaining = seconds % 60;

    return `${minutes}:${remaining
      .toString()
      .padStart(2, "0")}`;
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-6xl">

        <div>
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
            RAVINE
          </div>

          <h1 className="mt-3 text-4xl font-black">
            {isArabic ? "مكتبتي" : "My Library"}
          </h1>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            ["saved", isArabic ? "المحفوظات" : "Saved"],
            ["history", isArabic ? "سجل المشاهدة" : "Watch History"],
            ["liked", isArabic ? "المعجب بها" : "Liked Videos"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setTab(
                  value as "saved" | "history" | "liked"
                )
              }
              className="rounded-full border px-5 py-2.5 text-sm"
              style={{
                backgroundColor:
                  tab === value
                    ? "#C47A52"
                    : "#151719",
                color:
                  tab === value
                    ? "#090909"
                    : "#F1E9DC",
                borderColor:
                  tab === value
                    ? "#C47A52"
                    : "rgba(241,233,220,.10)"
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <div className="mt-10 text-sm text-[#F1E9DC]/50">
            {isArabic ? "جارٍ تحميل المكتبة..." : "Loading library..."}
          </div>
        ) : tab === "history" ? (
          <div className="mt-8 space-y-4">
            {history.length === 0 ? (
              <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                {isArabic ? "سجل المشاهدة فارغ." : "Your watch history is empty."}
              </div>
            ) : (
              history.map((row) => {
                const video = row.videos;

                if (!video) return null;

                const progress =
                  video.duration && video.duration > 0
                    ? Math.min(
                        100,
                        (row.progress_seconds /
                          video.duration) *
                          100
                      )
                    : 0;

                return (
                  <a
                    key={`${video.id}-${row.last_watched_at}`}
                    href={`/${locale}/watch/${video.id}`}
                    className="block rounded-3xl border border-[#183F46]/60 bg-[#151719] p-4 md:flex md:gap-5"
                  >
                    <div className="relative aspect-video overflow-hidden rounded-2xl bg-[#183F46] md:w-64 md:shrink-0">
                      <img
                        src={
                          video.thumbnail_url ||
                          "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700"
                        }
                        alt={video.title}
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="mt-4 min-w-0 md:mt-0">
                      <h2 className="font-bold">
                        {video.title}
                      </h2>

                      <p className="mt-2 text-xs text-[#F1E9DC]/40">
                        {row.completed
                          ? (isArabic ? "مكتمل" : "Completed")
                          : `${isArabic ? "استئناف من" : "Resume at"} ${duration(
                              row.progress_seconds
                            )}`}
                      </p>

                      <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#090909]">
                        <div
                          className="h-full bg-[#C47A52]"
                          style={{
                            width: `${progress}%`
                          }}
                        />
                      </div>
                    </div>
                  </a>
                );
              })
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.length === 0 ? (
              <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                {isArabic ? "لا يوجد شيء هنا حتى الآن." : "Nothing here yet."}
              </div>
            ) : (
              videos.map((video) => (
                <a
                  key={video.id}
                  href={`/${locale}/watch/${video.id}`}
                  className="overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719]"
                >
                  <div className="aspect-video overflow-hidden bg-[#183F46]">
                    <img
                      src={
                        video.thumbnail_url ||
                        "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=700"
                      }
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <h2 className="font-bold">
                      {video.title}
                    </h2>

                    <p className="mt-2 text-xs text-[#F1E9DC]/40">
                      {(video.views ?? 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"} ·{" "}
                      {(video.likes ?? 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}
                    </p>
                  </div>
                </a>
              ))
            )}
          </div>
        )}

        <a
          href={`/${locale}`}
          className="mt-10 inline-block text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          ← Back to RAVINE
        </a>

      </div>
    </main>
  );
}
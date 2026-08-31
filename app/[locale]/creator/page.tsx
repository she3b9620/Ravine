"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  published: boolean | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  bio: string | null;
};

export default function CreatorDashboard() {
  const supabase = createClient();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/ar/auth";
        return;
      }

      const { data: creatorData, error: creatorError } =
        await supabase
          .from("creators")
          .select("id,name,username,bio")
          .eq("user_id", user.id)
          .single();

      if (creatorError || !creatorData) {
        setError(
          creatorError?.message || "Creator profile not found."
        );
        setLoading(false);
        return;
      }

      setCreator(creatorData);

      const { data: videoData, error: videoError } =
        await supabase
          .from("videos")
          .select("id,title,published,views,likes,created_at")
          .eq("creator_id", creatorData.id)
          .order("created_at", { ascending: false });

      if (videoError) {
        setError(videoError.message);
      } else {
        setVideos(videoData ?? []);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  async function togglePublished(video: Video) {
    setError("");
    setUpdatingId(video.id);

    const nextValue = !video.published;

    const { error: updateError } = await supabase
      .from("videos")
      .update({
        published: nextValue
      })
      .eq("id", video.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setVideos((current) =>
        current.map((item) =>
          item.id === video.id
            ? { ...item, published: nextValue }
            : item
        )
      );
    }

    setUpdatingId(null);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-5xl text-center">
          Loading Creator Dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-5xl">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
              RAVINE CREATOR
            </div>

            <h1 className="mt-3 text-4xl font-black">
              Creator Dashboard
            </h1>

            {creator && (
              <p className="mt-2 text-[#F1E9DC]/50">
                @{creator.username || creator.name}
              </p>
            )}
          </div>

          <a
            href="/ar/creator/upload"
            className="inline-flex rounded-2xl bg-[#C47A52] px-5 py-3 text-sm font-bold text-[#090909]"
          >
            Upload Video
          </a>
        </div>

        {error && (
          <div className="mt-8 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm leading-6 text-red-200">
            {error}
          </div>
        )}

        <div className="mt-10 grid gap-5 md:grid-cols-3">

          <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">
            <div className="text-sm text-[#F1E9DC]/50">
              Creator
            </div>

            <div className="mt-2 text-2xl font-black">
              {creator?.name || "RAVINE"}
            </div>
          </div>

          <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">
            <div className="text-sm text-[#F1E9DC]/50">
              Videos
            </div>

            <div className="mt-2 text-3xl font-black">
              {videos.length}
            </div>
          </div>

          <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6">
            <div className="text-sm text-[#F1E9DC]/50">
              Total views
            </div>

            <div className="mt-2 text-3xl font-black">
              {videos
                .reduce(
                  (total, video) =>
                    total + Number(video.views || 0),
                  0
                )
                .toLocaleString()}
            </div>
          </div>

        </div>

        <section className="mt-10">
          <div className="mb-5">
            <h2 className="text-2xl font-bold">
              Your videos
            </h2>
          </div>

          <div className="space-y-3">
            {videos.length === 0 ? (
              <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/60">
                No videos yet.
              </div>
            ) : (
              videos.map((video) => (
                <div
                  key={video.id}
                  className="flex flex-col gap-4 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <div className="font-bold">
                      {video.title}
                    </div>

                    <div className="mt-2 text-xs text-[#F1E9DC]/50">
                      {video.published
                        ? "Published"
                        : "Draft"}{" "}
                      · {(video.views ?? 0).toLocaleString()} views ·{" "}
                      {(video.likes ?? 0).toLocaleString()} likes
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <a
                      href={`/ar/watch/${video.id}`}
                      className="rounded-2xl border border-[#F1E9DC]/10 px-4 py-2 text-sm text-[#F1E9DC]/70 hover:text-[#F1E9DC]"
                    >
                      View
                    </a>

                    <button
                      type="button"
                      onClick={() => togglePublished(video)}
                      disabled={updatingId === video.id}
                      className="rounded-2xl bg-[#C47A52] px-4 py-2 text-sm font-bold text-[#090909] disabled:opacity-50"
                    >
                      {updatingId === video.id
                        ? "Saving..."
                        : video.published
                          ? "Unpublish"
                          : "Publish"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

      </div>
    </main>
  );
}
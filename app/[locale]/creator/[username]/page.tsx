"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_id: string | null;
};

type Profile = {
  avatar_url: string | null;
  cover_url: string | null;
  display_name: string | null;
  bio: string | null;
};

type Video = {
  id: number;
  title: string;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
};

export default function CreatorProfilePage() {
  const params = useParams();
  const username = String(params.username);

  const supabase = createClient();

  const [creator, setCreator] = useState<Creator | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(false);

  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");

      const { data: creatorData, error: creatorError } =
        await supabase
          .from("creators")
          .select(
            "id,name,username,avatar_url,bio,user_id"
          )
          .eq("username", username)
          .maybeSingle();

      if (creatorError) {
        setError(creatorError.message);
        setLoading(false);
        return;
      }

      if (!creatorData) {
        setError("Creator not found.");
        setLoading(false);
        return;
      }

      setCreator(creatorData);

      if (creatorData.user_id) {
        const { data: profileData } =
          await supabase
            .from("profiles")
            .select(
              "avatar_url,cover_url,display_name,bio"
            )
            .eq("id", creatorData.user_id)
            .maybeSingle();

        setProfile(profileData ?? null);
      }

      const { count: followerCount } =
        await supabase
          .from("follows")
          .select("follower_id", {
            count: "exact",
            head: true
          })
          .eq("creator_id", creatorData.id);

      setFollowers(followerCount ?? 0);

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (user) {
        const { data: followRow } =
          await supabase
            .from("follows")
            .select("creator_id")
            .eq("follower_id", user.id)
            .eq("creator_id", creatorData.id)
            .maybeSingle();

        setFollowing(Boolean(followRow));
      }

      const { data: videoData, error: videoError } =
        await supabase
          .from("videos")
          .select(
            "id,title,thumbnail_url,duration,views,likes"
          )
          .eq("creator_id", creatorData.id)
          .eq("published", true)
          .order("created_at", {
            ascending: false
          });

      if (videoError) {
        setError(videoError.message);
      } else {
        setVideos(videoData ?? []);
      }

      setLoading(false);
    }

    void load();
  }, [username]);

  async function toggleFollow() {
    if (!creator || followLoading) return;

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/ar/auth";
      return;
    }

    setFollowLoading(true);
    setError("");

    try {
      if (following) {
        const { error: deleteError } =
          await supabase
            .from("follows")
            .delete()
            .eq("follower_id", user.id)
            .eq("creator_id", creator.id);

        if (deleteError) throw deleteError;

        setFollowing(false);
        setFollowers((value) =>
          Math.max(0, value - 1)
        );
      } else {
        const { error: insertError } =
          await supabase
            .from("follows")
            .insert({
              follower_id: user.id,
              creator_id: creator.id
            });

        if (insertError) throw insertError;

        setFollowing(true);
        setFollowers((value) => value + 1);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update follow."
      );
    } finally {
      setFollowLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl text-center">
          Loading creator...
        </div>
      </main>
    );
  }

  if (!creator || error && !creator) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl">
          <a
            href="/ar"
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            ← Back to RAVINE
          </a>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-[#151719] p-8">
            <h1 className="text-2xl font-bold">
              Creator not found
            </h1>

            <p className="mt-3 text-sm text-red-200">
              {error || "Creator not found."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const avatar =
    profile?.avatar_url ||
    creator.avatar_url ||
    "/RAVINE.png";

  const displayName =
    profile?.display_name ||
    creator.name;

  const bio =
    profile?.bio ||
    creator.bio;

  const cover =
    profile?.cover_url ||
    null;

  return (
    <main className="min-h-screen bg-[#090909] text-[#F1E9DC]">

      <div className="mx-auto max-w-6xl px-5 py-8 md:px-8">

        <a
          href="/ar"
          className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
        >
          ← Back to RAVINE
        </a>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719]">

          <div
            className="h-48 bg-cover bg-center md:h-64"
            style={{
              backgroundImage: cover
                ? `url(${cover})`
                : "linear-gradient(135deg,#183F46 0%,#151719 55%,#090909 100%)"
            }}
          />

          <div className="relative px-6 pb-7 md:px-8">

            <div className="-mt-12 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">

              <div className="flex flex-col gap-4 md:flex-row md:items-end">

                <img
                  src={avatar}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border-4 border-[#151719] bg-[#090909] object-cover"
                />

                <div className="pb-1">
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
                    RAVINE CREATOR
                  </div>

                  <h1 className="mt-2 text-4xl font-black">
                    {displayName}
                  </h1>

                  {creator.username && (
                    <p className="mt-1 text-sm text-[#C47A52]">
                      @{creator.username}
                    </p>
                  )}

                  <div className="mt-3 text-sm text-[#F1E9DC]/40">
                    {followers.toLocaleString()} followers ·{" "}
                    {videos.length.toLocaleString()} videos
                  </div>
                </div>

              </div>

              <div className="flex flex-wrap gap-2">

                <button
                  type="button"
                  onClick={toggleFollow}
                  disabled={followLoading}
                  className="rounded-full px-6 py-3 text-sm font-bold disabled:opacity-50"
                  style={{
                    backgroundColor: following
                      ? "#151719"
                      : "#C47A52",
                    color: following
                      ? "#F1E9DC"
                      : "#090909",
                    border: following
                      ? "1px solid rgba(241,233,220,.12)"
                      : "1px solid #C47A52"
                  }}
                >
                  {followLoading
                    ? "Saving..."
                    : following
                      ? "Following"
                      : "Follow"}
                </button>

                <a
                  href="/ar/creator"
                  className="rounded-full border border-[#F1E9DC]/10 px-5 py-3 text-sm text-[#F1E9DC]/70"
                >
                  Creator Dashboard
                </a>

              </div>
            </div>

            {bio && (
              <p className="mt-6 max-w-3xl text-sm leading-7 text-[#F1E9DC]/60">
                {bio}
              </p>
            )}

          </div>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <section className="mt-10">
          <h2 className="text-2xl font-bold">
            Videos
          </h2>

          {videos.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
              No published videos yet.
            </div>
          ) : (
            <div className="mt-5 grid gap-6 md:grid-cols-2 lg:grid-cols-3">

              {videos.map((video) => (
                <a
                  key={video.id}
                  href={`/ar/watch/${video.id}`}
                  className="overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719] transition hover:-translate-y-1 hover:border-[#C47A52]/40"
                >
                  <div className="aspect-video overflow-hidden bg-[#183F46]">

                    <img
                      src={
                        video.thumbnail_url ||
                        "/RAVINE.png"
                      }
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />

                  </div>

                  <div className="p-5">
                    <h3 className="font-bold leading-6">
                      {video.title}
                    </h3>

                    <p className="mt-2 text-xs text-[#F1E9DC]/40">
                      {(video.views ?? 0).toLocaleString()} views ·{" "}
                      {(video.likes ?? 0).toLocaleString()} likes
                    </p>
                  </div>
                </a>
              ))}

            </div>
          )}
        </section>

      </div>
    </main>
  );
}
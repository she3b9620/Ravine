"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  published: boolean;
  views: number | null;
  likes: number | null;
  creator_id: number | null;
  created_at: string | null;
};

type Comment = {
  id: number;
  video_id: number;
  user_id: string | null;
  content: string;
  created_at: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  is_verified: boolean;
  is_suspended: boolean;
  created_at: string | null;
};

export default function AdminPage() {
  const supabase = createClient();

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [tab, setTab] = useState<
    "overview" | "videos" | "comments" | "users"
  >("overview");

  const [stats, setStats] = useState({
    videos: 0,
    published: 0,
    comments: 0,
    users: 0,
    views: 0
  });

  useEffect(() => {
    async function checkAdmin() {
      setLoading(true);
      setError("");

      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/ar/auth";
        return;
      }

      const { data: isAdmin, error: adminError } =
        await supabase.rpc("is_ravine_admin");

      if (adminError) {
        setError(adminError.message);
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        setError("You do not have permission to access this page.");
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const [
        videosResult,
        commentsResult,
        profilesResult
      ] = await Promise.all([
        supabase
          .from("videos")
          .select(
            "id,title,published,views,likes,creator_id,created_at"
          )
          .order("created_at", { ascending: false }),

        supabase
          .from("comments")
          .select(
            "id,video_id,user_id,content,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),

        supabase
          .from("profiles")
          .select(
            "id,username,display_name,country,is_verified,is_suspended,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100)
      ]);

      if (videosResult.error) {
        setError(videosResult.error.message);
      }

      if (commentsResult.error) {
        setError(commentsResult.error.message);
      }

      if (profilesResult.error) {
        setError(profilesResult.error.message);
      }

      const videoRows = videosResult.data ?? [];
      const commentRows = commentsResult.data ?? [];
      const profileRows = profilesResult.data ?? [];

      setVideos(videoRows);
      setComments(commentRows);
      setProfiles(profileRows);

      setStats({
        videos: videoRows.length,
        published: videoRows.filter(
          (video) => video.published
        ).length,
        comments: commentRows.length,
        users: profileRows.length,
        views: videoRows.reduce(
          (total, video) =>
            total + Number(video.views ?? 0),
          0
        )
      });

      setLoading(false);
    }

    void checkAdmin();
  }, []);

  async function togglePublish(video: Video) {
    const { error: updateError } = await supabase
      .from("videos")
      .update({
        published: !video.published
      })
      .eq("id", video.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setVideos((current) =>
      current.map((item) =>
        item.id === video.id
          ? {
              ...item,
              published: !item.published
            }
          : item
      )
    );

    setStats((current) => ({
      ...current,
      published: current.published + (video.published ? -1 : 1)
    }));
  }

  async function deleteVideo(video: Video) {
    if (
      !window.confirm(
        `Delete "${video.title}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setVideos((current) =>
      current.filter((item) => item.id !== video.id)
    );

    setStats((current) => ({
      ...current,
      videos: Math.max(0, current.videos - 1),
      published:
        current.published -
        (video.published ? 1 : 0),
      views:
        current.views -
        Number(video.views ?? 0)
    }));
  }

  async function deleteComment(comment: Comment) {
    if (
      !window.confirm(
        "Delete this comment?"
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setComments((current) =>
      current.filter((item) => item.id !== comment.id)
    );

    setStats((current) => ({
      ...current,
      comments: Math.max(0, current.comments - 1)
    }));
  }

  async function toggleSuspended(profile: Profile) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_suspended: !profile.is_suspended
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              is_suspended: !item.is_suspended
            }
          : item
      )
    );
  }

  async function toggleVerified(profile: Profile) {
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        is_verified: !profile.is_verified
      })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              is_verified: !item.is_verified
            }
          : item
      )
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl text-center">
          Loading Admin Dashboard...
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl">
          <a
            href="/ar"
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            ← Back to RAVINE
          </a>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-[#151719] p-8">
            <h1 className="text-2xl font-bold">
              Access denied
            </h1>

            <p className="mt-3 text-sm text-red-200">
              {error || "Admin access required."}
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-12 text-[#F1E9DC]">
      <div className="mx-auto max-w-7xl">

        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#C47A52]">
              RAVINE ADMIN
            </div>

            <h1 className="mt-3 text-4xl font-black">
              Moderation Dashboard
            </h1>
          </div>

          <a
            href="/ar"
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            ← Back to RAVINE
          </a>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            ["overview", "Overview"],
            ["videos", "Videos"],
            ["comments", "Comments"],
            ["users", "Users"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() =>
                setTab(
                  value as
                    | "overview"
                    | "videos"
                    | "comments"
                    | "users"
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

        {tab === "overview" && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {[
              ["Videos", stats.videos],
              ["Published", stats.published],
              ["Comments", stats.comments],
              ["Users", stats.users],
              ["Views", stats.views.toLocaleString()]
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6"
              >
                <div className="text-sm text-[#F1E9DC]/45">
                  {label}
                </div>

                <div className="mt-2 text-3xl font-black">
                  {value}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "videos" && (
          <section className="mt-8">
            <div className="space-y-3">
              {videos.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                  No videos found.
                </div>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col gap-4 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h2 className="font-bold">
                        {video.title}
                      </h2>

                      <p className="mt-2 text-xs text-[#F1E9DC]/40">
                        ID {video.id} ·{" "}
                        {video.published
                          ? "Published"
                          : "Draft"}{" "}
                        ·{" "}
                        {(video.views ?? 0).toLocaleString()} views ·{" "}
                        {(video.likes ?? 0).toLocaleString()} likes
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/ar/watch/${video.id}`}
                        className="rounded-xl border border-[#F1E9DC]/10 px-4 py-2 text-xs"
                      >
                        View
                      </a>

                      <button
                        type="button"
                        onClick={() =>
                          togglePublish(video)
                        }
                        className="rounded-xl bg-[#C47A52] px-4 py-2 text-xs font-bold text-[#090909]"
                      >
                        {video.published
                          ? "Unpublish"
                          : "Publish"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteVideo(video)
                        }
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "comments" && (
          <section className="mt-8">
            <div className="space-y-3">
              {comments.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                  No comments found.
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5"
                  >
                    <div className="text-xs text-[#F1E9DC]/35">
                      Comment #{comment.id} · Video #{comment.video_id}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#F1E9DC]/75">
                      {comment.content}
                    </p>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          deleteComment(comment)
                        }
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

        {tab === "users" && (
          <section className="mt-8">
            <div className="space-y-3">
              {profiles.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                  No profiles found.
                </div>
              ) : (
                profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex flex-col gap-4 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h2 className="font-bold">
                        {profile.display_name ||
                          profile.username ||
                          "RAVINE User"}
                      </h2>

                      {profile.username && (
                        <p className="mt-1 text-xs text-[#C47A52]">
                          @{profile.username}
                        </p>
                      )}

                      <p className="mt-2 text-xs text-[#F1E9DC]/40">
                        {profile.country || "Country not set"}
                        {" · "}
                        {profile.is_verified
                          ? "Verified"
                          : "Not verified"}
                        {" · "}
                        {profile.is_suspended
                          ? "Suspended"
                          : "Active"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toggleVerified(profile)
                        }
                        className="rounded-xl border border-[#C47A52]/30 px-4 py-2 text-xs text-[#C47A52]"
                      >
                        {profile.is_verified
                          ? "Remove verification"
                          : "Verify"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          toggleSuspended(profile)
                        }
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300"
                      >
                        {profile.is_suspended
                          ? "Unsuspend"
                          : "Suspend"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
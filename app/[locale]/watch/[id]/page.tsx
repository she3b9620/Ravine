"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale } from "next-intl";
import { useParams } from "next/navigation";
import {
  Heart,
  Bookmark,
  Share2,
  Send,
  Reply,
  Trash2
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Video = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
  created_at: string | null;
  creator_id: number | null;
  category_id: number | null;
};

type Comment = {
  id: number;
  video_id: number | null;
  user_id: string | null;
  parent_comment_id: number | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
};

type Profile = {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

function extractStoragePath(videoUrl: string | null) {
  if (!videoUrl) return null;

  const marker = "/storage/v1/object/public/videos/";
  const markerIndex = videoUrl.indexOf(marker);

  if (markerIndex !== -1) {
    try {
      return decodeURIComponent(
        videoUrl.slice(markerIndex + marker.length)
      );
    } catch {
      return videoUrl.slice(markerIndex + marker.length);
    }
  }

  if (
    !videoUrl.startsWith("http://") &&
    !videoUrl.startsWith("https://")
  ) {
    return videoUrl.replace(/^\/+/, "");
  }

  return null;
}

function formatDate(value: string | null, locale: string) {
  if (!value) return "";

  try {
    return new Date(value).toLocaleDateString(
      locale === "ar" ? "ar-EG" : "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric"
      }
    );
  } catch {
    return "";
  }
}

export default function WatchPage() {
  const params = useParams();
  const locale = useLocale();
  const id = String(params.id);
  const supabase = useMemo(() => createClient(), []);

  const countedView = useRef(false);
  const playerRef = useRef<HTMLVideoElement | null>(null);
  const lastProgressSavedAt = useRef(-5);

  const [video, setVideo] = useState<Video | null>(null);
  const [signedUrl, setSignedUrl] = useState("");

  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  const [commentText, setCommentText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [resumeSeconds, setResumeSeconds] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [interacting, setInteracting] = useState(false);
  const [commentLoading, setCommentLoading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function getCurrentUser() {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    return user;
  }

  async function loadComments(videoId: number) {
    const { data, error: commentError } = await supabase
      .from("comments")
      .select(
        "id,video_id,user_id,parent_comment_id,content,created_at,updated_at"
      )
      .eq("video_id", videoId)
      .order("created_at", { ascending: true });

    if (commentError) {
      setError(commentError.message);
      return;
    }

    const loadedComments = (data ?? []) as Comment[];
    setComments(loadedComments);

    const userIds = [
      ...new Set(
        loadedComments
          .map((comment) => comment.user_id)
          .filter(Boolean) as string[]
      )
    ];

    if (userIds.length === 0) {
      setProfiles({});
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("id,display_name,username,avatar_url")
      .in("id", userIds);

    const nextProfiles: Record<string, Profile> = {};

    for (const profile of (profileData ?? []) as Profile[]) {
      nextProfiles[profile.id] = profile;
    }

    setProfiles(nextProfiles);
  }

  useEffect(() => {
    let cancelled = false;

    async function loadVideo() {
      setLoading(true);
      setError("");
      setMessage("");

      const { data, error: videoError } = await supabase
        .from("videos")
        .select("*")
        .eq("id", id)
        .eq("published", true)
        .single();

      if (cancelled) return;

      if (videoError || !data) {
        setError(videoError?.message || "Video not found.");
        setLoading(false);
        return;
      }

      const loadedVideo = data as Video;
      setVideo(loadedVideo);

      const user = await getCurrentUser();

      if (cancelled) return;

      if (user) {
        const { data: followRow } = await supabase
          .from("follows")
          .select("creator_id")
          .eq("follower_id", user.id)
          .eq("creator_id", loadedVideo.creator_id)
          .maybeSingle();

        if (cancelled) return;
        setFollowing(Boolean(followRow));

        const { data: historyRow } = await supabase
          .from("watch_history")
          .select("progress_seconds,completed")
          .eq("user_id", user.id)
          .eq("video_id", Number(id))
          .maybeSingle();

        if (cancelled) return;
        if (historyRow && !historyRow.completed) {
          setResumeSeconds(Number(historyRow.progress_seconds || 0));
        }

        const { count } = await supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("is_read", false);

        if (cancelled) return;
        setNotificationCount(count ?? 0);

        const { data: likeRow } = await supabase
          .from("video_likes")
          .select("video_id")
          .eq("user_id", user.id)
          .eq("video_id", Number(id))
          .maybeSingle();

        if (cancelled) return;

        const { data: saveRow } = await supabase
          .from("video_saves")
          .select("video_id")
          .eq("user_id", user.id)
          .eq("video_id", Number(id))
          .maybeSingle();

        if (cancelled) return;

        setLiked(Boolean(likeRow));
        setSaved(Boolean(saveRow));
      }

      if (!countedView.current) {
        countedView.current = true;

        const { data: newViews } = await supabase.rpc(
          "increment_video_views",
          {
            video_id_input: Number(id)
          }
        );

        if (cancelled) return;

        if (typeof newViews === "number") {
          setVideo((current) =>
            current
              ? {
                  ...current,
                  views: newViews
                }
              : current
          );
        }
      }

      const storagePath = extractStoragePath(
        loadedVideo.video_url
      );

      if (!storagePath) {
        setError("Video file is unavailable.");
        setLoading(false);
        return;
      }

      const { data: signedData, error: signedError } =
        await supabase.storage
          .from("videos")
          .createSignedUrl(storagePath, 60 * 60);

      if (cancelled) return;

      if (signedError || !signedData?.signedUrl) {
        setError(
          signedError?.message ||
            "Unable to create secure video URL."
        );
        setLoading(false);
        return;
      }

      setSignedUrl(signedData.signedUrl);

      await loadComments(Number(id));

      if (!cancelled) {
        setLoading(false);
      }
    }

    void loadVideo();

    return () => {
      cancelled = true;
    };
  }, [id, supabase]);

  async function requireUser() {
    const user = await getCurrentUser();

    if (!user) {
      window.location.href = `/${locale}/auth`;
      return null;
    }

    return user;
  }

  async function toggleFollow() {
    if (!video || interacting || !video.creator_id) return;

    const user = await requireUser();
    if (!user) return;

    setInteracting(true);
    setError("");

    try {
      if (following) {
        const { error: deleteError } = await supabase
          .from("follows")
          .delete()
          .eq("follower_id", user.id)
          .eq("creator_id", video.creator_id);

        if (deleteError) throw deleteError;

        setFollowing(false);
      } else {
        const { error: insertError } = await supabase
          .from("follows")
          .insert({
            follower_id: user.id,
            creator_id: video.creator_id
          });

        if (insertError) throw insertError;

        setFollowing(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update follow."
      );
    } finally {
      setInteracting(false);
    }
  }

  async function saveWatchProgress(
    seconds: number,
    completed = false
  ) {
    const user = await getCurrentUser();

    if (!user || !video) return;

    await supabase.rpc("save_watch_progress", {
      video_id_input: video.id,
      progress_seconds_input: Math.floor(seconds),
      completed_input: completed
    });
  }

  async function toggleLike() {
    if (!video || interacting) return;

    const user = await requireUser();
    if (!user) return;

    setInteracting(true);
    setError("");
    setMessage("");

    try {
      if (liked) {
        const { error: deleteError } = await supabase
          .from("video_likes")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", video.id);

        if (deleteError) throw deleteError;

        setLiked(false);

        setVideo((current) =>
          current
            ? {
                ...current,
                likes: Math.max(0, Number(current.likes ?? 0) - 1)
              }
            : current
        );
      } else {
        const { error: insertError } = await supabase
          .from("video_likes")
          .insert({
            user_id: user.id,
            video_id: video.id
          });

        if (insertError) throw insertError;

        setLiked(true);

        setVideo((current) =>
          current
            ? {
                ...current,
                likes: Number(current.likes ?? 0) + 1
              }
            : current
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update like."
      );
    } finally {
      setInteracting(false);
    }
  }

  async function toggleSave() {
    if (!video || interacting) return;

    const user = await requireUser();
    if (!user) return;

    setInteracting(true);
    setError("");
    setMessage("");

    try {
      if (saved) {
        const { error: deleteError } = await supabase
          .from("video_saves")
          .delete()
          .eq("user_id", user.id)
          .eq("video_id", video.id);

        if (deleteError) throw deleteError;

        setSaved(false);
      } else {
        const { error: insertError } = await supabase
          .from("video_saves")
          .insert({
            user_id: user.id,
            video_id: video.id
          });

        if (insertError) throw insertError;

        setSaved(true);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update saved videos."
      );
    } finally {
      setInteracting(false);
    }
  }

  async function shareVideo() {
    const shareUrl = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video?.title || "RAVINE",
          text: video?.description || "Watch this on RAVINE",
          url: shareUrl
        });

        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setMessage("Video link copied.");
    } catch (err) {
      if (
        err instanceof Error &&
        err.name === "AbortError"
      ) {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Video link copied.");
      } catch {
        setError("Unable to share this video.");
      }
    }
  }

  async function submitComment(
    event: React.FormEvent<HTMLFormElement>,
    parentCommentId: number | null = null
  ) {
    event.preventDefault();

    const text = parentCommentId
      ? replyText.trim()
      : commentText.trim();

    if (!text) return;

    const user = await requireUser();
    if (!user) return;

    setCommentLoading(true);
    setError("");
    setMessage("");

    try {
      const { error: insertError } = await supabase
        .from("comments")
        .insert({
          video_id: video?.id,
          user_id: user.id,
          parent_comment_id: parentCommentId,
          content: text
        });

      if (insertError) throw insertError;

      setCommentText("");
      setReplyText("");
      setReplyingTo(null);

      await loadComments(Number(id));

      setMessage(
        parentCommentId
          ? "Reply added."
          : "Comment added."
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to add comment."
      );
    } finally {
      setCommentLoading(false);
    }
  }

  async function deleteComment(commentId: number) {
    const user = await requireUser();
    if (!user) return;

    if (
      !window.confirm(
        "Delete this comment and its replies?"
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    await loadComments(Number(id));
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl text-center">
          Loading video...
        </div>
      </main>
    );
  }

  if (error && !video) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl">
          <a
            href={`/${locale}`}
            className="text-sm text-[#F1E9DC]/60 hover:text-[#C47A52]"
          >
            ← Back to RAVINE
          </a>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-[#151719] p-8">
            <h1 className="text-2xl font-bold">
              Unable to load video
            </h1>

            <p className="mt-3 break-all text-sm text-red-200">
              {error}
            </p>
          </div>
        </div>
      </main>
    );
  }

  const topComments = comments.filter(
    (comment) => !comment.parent_comment_id
  );

  function getReplies(commentId: number) {
    return comments.filter(
      (comment) => comment.parent_comment_id === commentId
    );
  }

  function profileFor(comment: Comment) {
    return comment.user_id
      ? profiles[comment.user_id]
      : undefined;
  }

  return (
    <main className="min-h-screen bg-[#090909] px-5 py-10 text-[#F1E9DC]">
      <div className="mx-auto max-w-6xl">

        <a
          href={`/${locale}`}
          className="text-sm text-[#F1E9DC]/60 hover:text-[#C47A52]"
        >
          ← Back to RAVINE
        </a>

        <div className="mt-6 overflow-hidden rounded-3xl border border-[#183F46]/60 bg-[#151719]">

          <div className="aspect-video bg-black">
            {signedUrl ? (
              <video
                ref={playerRef}
                src={signedUrl}
                controls
                playsInline
                preload="metadata"
                poster={video?.thumbnail_url || undefined}
                className="h-full w-full"
                onLoadedMetadata={(event) => {
                  const player = event.currentTarget;

                  if (
                    resumeSeconds > 0 &&
                    resumeSeconds < player.duration - 5
                  ) {
                    player.currentTime = resumeSeconds;
                  }
                }}
                onTimeUpdate={(event) => {
                  const player = event.currentTarget;
                  const seconds = Math.floor(player.currentTime);

                  if (seconds >= lastProgressSavedAt.current + 5) {
                    lastProgressSavedAt.current = seconds;
                    void saveWatchProgress(
                      player.currentTime,
                      false
                    );
                  }
                }}
                onEnded={(event) => {
                  const duration = event.currentTarget.duration || 0;
                  lastProgressSavedAt.current = Math.floor(duration);
                  void saveWatchProgress(
                    duration,
                    true
                  );
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#F1E9DC]/50">
                Video unavailable.
              </div>
            )}
          </div>

          <div className="p-6 md:p-8">

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.2em] text-[#C47A52]">
                RAVINE
              </div>

              <button
                type="button"
                onClick={toggleFollow}
                disabled={interacting}
                className="rounded-full border px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
                style={{
                  borderColor: following
                    ? "#C47A52"
                    : "rgba(241,233,220,.12)",
                  color: following
                    ? "#C47A52"
                    : "#F1E9DC"
                }}
              >
                {following ? "Following" : "Follow"}
              </button>
            </div>

            <h1 className="mt-3 text-3xl font-black md:text-4xl">
              {video?.title}
            </h1>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-sm text-[#F1E9DC]/50">
                {(video?.views ?? 0).toLocaleString(
                  locale === "ar" ? "ar-EG" : "en-US"
                )} views
              </span>

              <button
                type="button"
                onClick={toggleLike}
                disabled={interacting}
                className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition disabled:opacity-50"
                style={{
                  borderColor: liked
                    ? "#C47A52"
                    : "rgba(241,233,220,.12)",
                  color: liked
                    ? "#C47A52"
                    : "#F1E9DC"
                }}
              >
                <Heart
                  size={16}
                  fill={liked ? "currentColor" : "none"}
                />
                {liked ? "Liked" : "Like"}
                <span>
                  {(video?.likes ?? 0).toLocaleString(
                    locale === "ar" ? "ar-EG" : "en-US"
                  )}
                </span>
              </button>

              <button
                type="button"
                onClick={toggleSave}
                disabled={interacting}
                className="inline-flex items-center gap-2 rounded-full border border-[#F1E9DC]/10 px-4 py-2 text-sm text-[#F1E9DC]/80 transition disabled:opacity-50"
              >
                <Bookmark
                  size={16}
                  fill={saved ? "currentColor" : "none"}
                />
                {saved ? "Saved" : "Save"}
              </button>

              <button
                type="button"
                onClick={() => {
                  window.location.href = `/${locale}/notifications`;
                }}
                className="inline-flex items-center gap-2 rounded-full border border-[#F1E9DC]/10 px-4 py-2 text-sm text-[#F1E9DC]/80 transition"
              >
                Notifications
                {notificationCount > 0 && (
                  <span className="rounded-full bg-[#C47A52] px-2 py-0.5 text-xs font-bold text-[#090909]">
                    {notificationCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={shareVideo}
                className="inline-flex items-center gap-2 rounded-full border border-[#F1E9DC]/10 px-4 py-2 text-sm text-[#F1E9DC]/80 transition"
              >
                <Share2 size={16} />
                Share
              </button>
            </div>

            {error && (
              <div className="mt-5 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
                {error}
              </div>
            )}

            {message && (
              <div className="mt-5 rounded-2xl border border-[#183F46]/60 bg-[#183F46]/10 p-4 text-sm text-[#F1E9DC]/70">
                {message}
              </div>
            )}

            {video?.description && (
              <p className="mt-6 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[#F1E9DC]/70">
                {video.description}
              </p>
            )}

          </div>
        </div>

        <section className="mt-8 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6 md:p-8">

          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Comments
              </h2>

              <p className="mt-1 text-sm text-[#F1E9DC]/40">
                {comments.length.toLocaleString(
                  locale === "ar" ? "ar-EG" : "en-US"
                )} comments
              </p>
            </div>
          </div>

          <form
            onSubmit={(event) =>
              submitComment(event, null)
            }
            className="mt-6 flex flex-col gap-3 sm:flex-row"
          >
            <input
              value={commentText}
              onChange={(event) =>
                setCommentText(event.target.value)
              }
              placeholder="Write a comment..."
              className="min-w-0 flex-1 rounded-2xl border border-[#F1E9DC]/10 bg-[#090909] px-4 py-3 text-sm outline-none focus:border-[#C47A52]"
            />

            <button
              type="submit"
              disabled={commentLoading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#C47A52] px-5 py-3 text-sm font-bold text-[#090909] disabled:opacity-50"
            >
              <Send size={16} />
              {commentLoading ? "Sending..." : "Comment"}
            </button>
          </form>

          <div className="mt-8 space-y-6">

            {topComments.length === 0 ? (
              <div className="rounded-2xl border border-[#F1E9DC]/5 bg-[#090909] p-6 text-sm text-[#F1E9DC]/40">
                No comments yet. Be the first.
              </div>
            ) : (
              topComments.map((comment) => {
                const profile = profileFor(comment);
                const replies = getReplies(comment.id);

                return (
                  <div key={comment.id}>

                    <div className="flex gap-3">

                      <img
                        src={
                          profile?.avatar_url ||
                          "https://i.pravatar.cc/80"
                        }
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full object-cover"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold">
                            {profile?.display_name ||
                              profile?.username ||
                              "RAVINE User"}
                          </span>

                          <span className="text-xs text-[#F1E9DC]/30">
                            {formatDate(comment.created_at, locale)}
                          </span>
                        </div>

                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[#F1E9DC]/70">
                          {comment.content}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-3">

                          <button
                            type="button"
                            onClick={() =>
                              setReplyingTo(
                                replyingTo === comment.id
                                  ? null
                                  : comment.id
                              )
                            }
                            className="inline-flex items-center gap-1 text-xs text-[#F1E9DC]/40 hover:text-[#C47A52]"
                          >
                            <Reply size={14} />
                            Reply
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              deleteComment(comment.id)
                            }
                            className="inline-flex items-center gap-1 text-xs text-[#F1E9DC]/30 hover:text-red-300"
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>

                        </div>

                        {replyingTo === comment.id && (
                          <form
                            onSubmit={(event) =>
                              submitComment(
                                event,
                                comment.id
                              )
                            }
                            className="mt-4 flex flex-col gap-2 sm:flex-row"
                          >
                            <input
                              value={replyText}
                              onChange={(event) =>
                                setReplyText(
                                  event.target.value
                                )
                              }
                              placeholder="Write a reply..."
                              className="min-w-0 flex-1 rounded-xl border border-[#F1E9DC]/10 bg-[#090909] px-3 py-2 text-sm outline-none focus:border-[#C47A52]"
                            />

                            <button
                              type="submit"
                              disabled={commentLoading}
                              className="rounded-xl bg-[#183F46] px-4 py-2 text-xs font-semibold disabled:opacity-50"
                            >
                              Reply
                            </button>
                          </form>
                        )}

                        {replies.length > 0 && (
                          <div className="mt-5 space-y-4 border-l border-[#F1E9DC]/10 pl-5">
                            {replies.map((reply) => {
                              const replyProfile =
                                profileFor(reply);

                              return (
                                <div
                                  key={reply.id}
                                  className="flex gap-3"
                                >
                                  <img
                                    src={
                                      replyProfile?.avatar_url ||
                                      "https://i.pravatar.cc/70"
                                    }
                                    alt=""
                                    className="h-8 w-8 shrink-0 rounded-full object-cover"
                                  />

                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="text-xs font-semibold">
                                        {replyProfile?.display_name ||
                                          replyProfile?.username ||
                                          "RAVINE User"}
                                      </span>

                                      <span className="text-[11px] text-[#F1E9DC]/30">
                                        {formatDate(
                                          reply.created_at,
                                          locale
                                        )}
                                      </span>
                                    </div>

                                    <p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-[#F1E9DC]/60">
                                      {reply.content}
                                    </p>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        deleteComment(
                                          reply.id
                                        )
                                      }
                                      className="mt-2 text-[11px] text-[#F1E9DC]/30 hover:text-red-300"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                      </div>
                    </div>

                  </div>
                );
              })
            )}

          </div>
        </section>

      </div>
    </main>
  );
}

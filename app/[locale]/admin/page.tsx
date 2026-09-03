"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
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

type Tab = "overview" | "videos" | "comments" | "users";

export default function AdminPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);

  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const [tab, setTab] = useState<Tab>("overview");
  const [busyId, setBusyId] = useState<string | null>(null);

  const [stats, setStats] = useState({
    videos: 0,
    published: 0,
    comments: 0,
    users: 0,
    views: 0,
  });

  useEffect(() => {
    let mounted = true;

    async function checkAdmin() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        window.location.href = `/${locale}/auth?next=/${locale}/admin`;
        return;
      }

      const { data: isAdmin, error: adminError } = await supabase.rpc(
        "is_ravine_admin"
      );

      if (!mounted) return;

      if (adminError) {
        setError(adminError.message);
        setLoading(false);
        return;
      }

      if (!isAdmin) {
        setError(
          isArabic
            ? "ليس لديك صلاحية للوصول إلى لوحة الإدارة."
            : "You do not have permission to access this page."
        );
        setLoading(false);
        return;
      }

      setAuthorized(true);

      const [videosResult, commentsResult, profilesResult] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,published,views,likes,creator_id,created_at")
          .order("created_at", { ascending: false }),
        supabase
          .from("comments")
          .select("id,video_id,user_id,content,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("profiles")
          .select(
            "id,username,display_name,country,is_verified,is_suspended,created_at"
          )
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

      if (!mounted) return;

      const firstError =
        videosResult.error || commentsResult.error || profilesResult.error;

      if (firstError) {
        setError(firstError.message);
      }

      const videoRows = videosResult.data ?? [];
      const commentRows = commentsResult.data ?? [];
      const profileRows = profilesResult.data ?? [];

      setVideos(videoRows);
      setComments(commentRows);
      setProfiles(profileRows);

      setStats({
        videos: videoRows.length,
        published: videoRows.filter((video) => video.published).length,
        comments: commentRows.length,
        users: profileRows.length,
        views: videoRows.reduce(
          (total, video) => total + Number(video.views ?? 0),
          0
        ),
      });

      setLoading(false);
    }

    void checkAdmin();

    return () => {
      mounted = false;
    };
  }, [isArabic, locale, supabase]);

  async function togglePublish(video: Video) {
    const key = `video:${video.id}`;
    if (busyId) return;

    setBusyId(key);
    setError("");

    const { error: updateError } = await supabase
      .from("videos")
      .update({ published: !video.published })
      .eq("id", video.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    setVideos((current) =>
      current.map((item) =>
        item.id === video.id
          ? { ...item, published: !item.published }
          : item
      )
    );

    setStats((current) => ({
      ...current,
      published: current.published + (video.published ? -1 : 1),
    }));
    setBusyId(null);
  }

  async function deleteVideo(video: Video) {
    if (busyId) return;

    const confirmed = window.confirm(
      isArabic
        ? `حذف «${video.title}»؟ لا يمكن التراجع عن هذا الإجراء.`
        : `Delete "${video.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setBusyId(`video-delete:${video.id}`);
    setError("");

    const { error: deleteError } = await supabase
      .from("videos")
      .delete()
      .eq("id", video.id);

    if (deleteError) {
      setError(deleteError.message);
      setBusyId(null);
      return;
    }

    setVideos((current) => current.filter((item) => item.id !== video.id));
    setStats((current) => ({
      ...current,
      videos: Math.max(0, current.videos - 1),
      published: Math.max(
        0,
        current.published - (video.published ? 1 : 0)
      ),
      views: Math.max(0, current.views - Number(video.views ?? 0)),
    }));
    setBusyId(null);
  }

  async function deleteComment(comment: Comment) {
    if (busyId) return;

    const confirmed = window.confirm(
      isArabic ? "حذف هذا التعليق؟" : "Delete this comment?"
    );

    if (!confirmed) return;

    setBusyId(`comment:${comment.id}`);
    setError("");

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", comment.id);

    if (deleteError) {
      setError(deleteError.message);
      setBusyId(null);
      return;
    }

    setComments((current) =>
      current.filter((item) => item.id !== comment.id)
    );
    setStats((current) => ({
      ...current,
      comments: Math.max(0, current.comments - 1),
    }));
    setBusyId(null);
  }

  async function toggleSuspended(profile: Profile) {
    if (busyId) return;

    setBusyId(`suspend:${profile.id}`);
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_suspended: !profile.is_suspended })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? { ...item, is_suspended: !item.is_suspended }
          : item
      )
    );
    setBusyId(null);
  }

  async function toggleVerified(profile: Profile) {
    if (busyId) return;

    setBusyId(`verify:${profile.id}`);
    setError("");

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_verified: !profile.is_verified })
      .eq("id", profile.id);

    if (updateError) {
      setError(updateError.message);
      setBusyId(null);
      return;
    }

    setProfiles((current) =>
      current.map((item) =>
        item.id === profile.id
          ? { ...item, is_verified: !item.is_verified }
          : item
      )
    );
    setBusyId(null);
  }

  const labels: Record<Tab, string> = {
    overview: isArabic ? "نظرة عامة" : "Overview",
    videos: isArabic ? "الأعمال" : "Videos",
    comments: isArabic ? "التعليقات" : "Comments",
    users: isArabic ? "المستخدمون" : "Users",
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-6xl text-center">
          {isArabic ? "جارٍ تحميل لوحة الإدارة..." : "Loading Admin Dashboard..."}
        </div>
      </main>
    );
  }

  if (!authorized) {
    return (
      <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]">
        <div className="mx-auto max-w-3xl">
          <a
            href={`/${locale}`}
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            {isArabic ? "← العودة إلى RAVINE" : "← Back to RAVINE"}
          </a>

          <div className="mt-8 rounded-3xl border border-red-500/20 bg-[#151719] p-8">
            <h1 className="text-2xl font-bold">
              {isArabic ? "الوصول مرفوض" : "Access denied"}
            </h1>
            <p className="mt-3 text-sm text-red-200">
              {error ||
                (isArabic ? "مطلوب وصول المشرف." : "Admin access required.")}
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
              {isArabic ? "لوحة الإشراف" : "Moderation Dashboard"}
            </h1>
          </div>

          <a
            href={`/${locale}`}
            className="text-sm text-[#F1E9DC]/50 hover:text-[#C47A52]"
          >
            {isArabic ? "← العودة إلى RAVINE" : "← Back to RAVINE"}
          </a>
        </div>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-2">
          {(Object.keys(labels) as Tab[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setTab(value)}
              className="rounded-full border px-5 py-2.5 text-sm"
              style={{
                backgroundColor: tab === value ? "#C47A52" : "#151719",
                color: tab === value ? "#090909" : "#F1E9DC",
                borderColor:
                  tab === value ? "#C47A52" : "rgba(241,233,220,.10)",
              }}
            >
              {labels[value]}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-5">
            {[
              [isArabic ? "الأعمال" : "Videos", stats.videos],
              [isArabic ? "المنشور" : "Published", stats.published],
              [isArabic ? "التعليقات" : "Comments", stats.comments],
              [isArabic ? "المستخدمون" : "Users", stats.users],
              [isArabic ? "المشاهدات" : "Views", stats.views.toLocaleString()],
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-6"
              >
                <div className="text-sm text-[#F1E9DC]/45">{label}</div>
                <div className="mt-2 text-3xl font-black">{value}</div>
              </div>
            ))}
          </div>
        )}

        {tab === "videos" && (
          <section className="mt-8">
            <div className="space-y-3">
              {videos.length === 0 ? (
                <div className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-8 text-sm text-[#F1E9DC]/50">
                  {isArabic ? "لا توجد أعمال." : "No videos found."}
                </div>
              ) : (
                videos.map((video) => (
                  <div
                    key={video.id}
                    className="flex flex-col gap-4 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h2 className="font-bold">{video.title}</h2>
                      <p className="mt-2 text-xs text-[#F1E9DC]/40">
                        ID {video.id} · {video.published
                          ? isArabic
                            ? "منشور"
                            : "Published"
                          : isArabic
                            ? "مسودة"
                            : "Draft"} · {Number(video.views ?? 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"} · {Number(video.likes ?? 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <a
                        href={`/${locale}/watch/${video.id}`}
                        className="rounded-xl border border-[#F1E9DC]/10 px-4 py-2 text-xs"
                      >
                        {isArabic ? "عرض" : "View"}
                      </a>

                      <button
                        type="button"
                        onClick={() => void togglePublish(video)}
                        disabled={busyId !== null}
                        className="rounded-xl bg-[#C47A52] px-4 py-2 text-xs font-bold text-[#090909] disabled:cursor-wait disabled:opacity-50"
                      >
                        {busyId === `video:${video.id}`
                          ? isArabic
                            ? "جارٍ الحفظ..."
                            : "Saving..."
                          : video.published
                            ? isArabic
                              ? "إلغاء النشر"
                              : "Unpublish"
                            : isArabic
                              ? "نشر"
                              : "Publish"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void deleteVideo(video)}
                        disabled={busyId !== null}
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300 disabled:cursor-wait disabled:opacity-50"
                      >
                        {busyId === `video-delete:${video.id}`
                          ? isArabic
                            ? "جارٍ الحذف..."
                            : "Deleting..."
                          : isArabic
                            ? "حذف"
                            : "Delete"}
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
                  {isArabic ? "لا توجد تعليقات." : "No comments found."}
                </div>
              ) : (
                comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5"
                  >
                    <div className="text-xs text-[#F1E9DC]/35">
                      {isArabic ? "تعليق" : "Comment"} #{comment.id} · {isArabic ? "عمل" : "Video"} #{comment.video_id}
                    </div>

                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-[#F1E9DC]/75">
                      {comment.content}
                    </p>

                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={() => void deleteComment(comment)}
                        disabled={busyId !== null}
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300 disabled:cursor-wait disabled:opacity-50"
                      >
                        {busyId === `comment:${comment.id}`
                          ? isArabic
                            ? "جارٍ الحذف..."
                            : "Deleting..."
                          : isArabic
                            ? "حذف"
                            : "Delete"}
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
                  {isArabic ? "لا يوجد مستخدمون." : "No profiles found."}
                </div>
              ) : (
                profiles.map((profile) => (
                  <div
                    key={profile.id}
                    className="flex flex-col gap-4 rounded-3xl border border-[#183F46]/60 bg-[#151719] p-5 md:flex-row md:items-center md:justify-between"
                  >
                    <div>
                      <h2 className="font-bold">
                        {profile.display_name || profile.username || (isArabic ? "مستخدم RAVINE" : "RAVINE User")}
                      </h2>

                      {profile.username && (
                        <p className="mt-1 text-xs text-[#C47A52]">@{profile.username}</p>
                      )}

                      <p className="mt-2 text-xs text-[#F1E9DC]/40">
                        {profile.country || (isArabic ? "الدولة غير محددة" : "Country not set")} · {profile.is_verified
                          ? isArabic
                            ? "موثق"
                            : "Verified"
                          : isArabic
                            ? "غير موثق"
                            : "Not verified"} · {profile.is_suspended
                          ? isArabic
                            ? "موقوف"
                            : "Suspended"
                          : isArabic
                            ? "نشط"
                            : "Active"}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void toggleVerified(profile)}
                        disabled={busyId !== null}
                        className="rounded-xl border border-[#C47A52]/30 px-4 py-2 text-xs text-[#C47A52] disabled:cursor-wait disabled:opacity-50"
                      >
                        {busyId === `verify:${profile.id}`
                          ? isArabic
                            ? "جارٍ الحفظ..."
                            : "Saving..."
                          : profile.is_verified
                            ? isArabic
                              ? "إلغاء التوثيق"
                              : "Remove verification"
                            : isArabic
                              ? "توثيق"
                              : "Verify"}
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleSuspended(profile)}
                        disabled={busyId !== null}
                        className="rounded-xl border border-red-500/30 px-4 py-2 text-xs text-red-300 disabled:cursor-wait disabled:opacity-50"
                      >
                        {busyId === `suspend:${profile.id}`
                          ? isArabic
                            ? "جارٍ الحفظ..."
                            : "Saving..."
                          : profile.is_suspended
                            ? isArabic
                              ? "إلغاء الإيقاف"
                              : "Unsuspend"
                            : isArabic
                              ? "إيقاف"
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

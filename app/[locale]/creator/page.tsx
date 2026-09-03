"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, BarChart3, FileVideo2, Heart, Plus, Sparkles, Users, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = {
  id: number;
  title: string;
  published: boolean | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  bio: string | null;
};

type StatCard = {
  icon: LucideIcon;
  label: string;
  value: string;
};

function compact(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

export default function CreatorDashboard() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);

  const [creator, setCreator] = useState<Creator | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (userError || !user) {
        window.location.href = `/${locale}/auth?next=/${locale}/creator`;
        return;
      }

      const { data: creatorData, error: creatorError } = await supabase
        .from("creators")
        .select("id,name,username,bio")
        .eq("user_id", user.id)
        .single();

      if (!mounted) return;

      if (creatorError || !creatorData) {
        setError(
          creatorError?.message ||
            (isArabic ? "ملف المبدع غير موجود." : "Creator profile not found.")
        );
        setLoading(false);
        return;
      }

      setCreator(creatorData);

      const { data: videoData, error: videoError } = await supabase
        .from("videos")
        .select("id,title,published,views,likes,created_at,content_type")
        .eq("user_id", user.id)
        .eq("creator_id", creatorData.id)
        .order("created_at", { ascending: false });

      if (!mounted) return;

      if (videoError) {
        setError(videoError.message);
      } else {
        setVideos(videoData ?? []);
      }

      setLoading(false);
    }

    void loadDashboard();

    return () => {
      mounted = false;
    };
  }, [isArabic, locale, supabase]);

  async function togglePublished(video: Video) {
    if (updatingId === video.id) return;

    setError("");
    setUpdatingId(video.id);

    const nextValue = !video.published;

    const { error: updateError } = await supabase
      .from("videos")
      .update({ published: nextValue })
      .eq("id", video.id)
      .eq("user_id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .eq("creator_id", creator?.id ?? -1);

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
          {isArabic ? "جارٍ تحميل لوحة المبدع..." : "Loading Creator Dashboard..."}
        </div>
      </main>
    );
  }

  const published = videos.filter((video) => video.published).length;
  const totalViews = videos.reduce((total, video) => total + Number(video.views ?? 0), 0);
  const totalLikes = videos.reduce((total, video) => total + Number(video.likes ?? 0), 0);
  const creatorName = creator?.name || creator?.username || (isArabic ? "المبدع" : "Creator");

  const stats: StatCard[] = [
    { icon: FileVideo2, label: isArabic ? "الأعمال" : "Works", value: compact(videos.length) },
    { icon: BarChart3, label: isArabic ? "المشاهدات" : "Views", value: compact(totalViews) },
    { icon: Heart, label: isArabic ? "الإعجابات" : "Likes", value: compact(totalLikes) },
    { icon: Sparkles, label: isArabic ? "المنشور" : "Published", value: compact(published) },
  ];

  return (
    <PlatformShell
      active="creators"
      eyebrow={isArabic ? "مساحة المبدع" : "Creator Space"}
      title={isArabic ? `مساحة ${creatorName}` : `${creatorName}'s Creator Space`}
      description={
        isArabic
          ? "إدارة أعمالك الحالية من نفس حساب RAVINE، مع صلاحية مرتبطة بملف المبدع نفسه."
          : "Manage your RAVINE work from the same account, with publishing tied to your creator identity."
      }
    >
      <div className="mx-auto max-w-[1440px] space-y-8 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && (
          <div className="rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>
            {error}
          </div>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.76)" }}>
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}>
                <Icon size={18} />
              </span>
              <div className="mt-5 text-3xl font-black">{value}</div>
              <div className="mt-1 text-xs" style={{ color: "rgba(241,233,220,.50)" }}>{label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <a href={`/${locale}/studio`} className="group rounded-[30px] border p-6 transition hover:-translate-y-1" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}><Sparkles size={20}/></span><ArrowUpRight size={16} style={{ color: "rgba(241,233,220,.35)" }}/></div>
            <h2 className="mt-5 text-xl font-black">{isArabic ? "فتح Studio" : "Open Studio"}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "المساحة الرئيسية لإدارة المحتوى والتحليلات والملف." : "Your main workspace for content, analytics and profile."}</p>
          </a>

          <a href={`/${locale}/creator/upload`} className="group rounded-[30px] border p-6 transition hover:-translate-y-1" style={{ borderColor: "rgba(196,122,82,.28)", background: "linear-gradient(145deg,rgba(196,122,82,.12),rgba(21,23,25,.80))" }}>
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.14)", color: "#C47A52" }}><Plus size={20}/></span><ArrowUpRight size={16} style={{ color: "rgba(241,233,220,.35)" }}/></div>
            <h2 className="mt-5 text-xl font-black">{isArabic ? "رفع عمل" : "Upload work"}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "أضف فيديو أو Short أو Podcast كمسودة جديدة." : "Add a video, Short or Podcast as a new draft."}</p>
          </a>

          <a href={`/${locale}/creator/${creator?.username || ""}`} className="group rounded-[30px] border p-6 transition hover:-translate-y-1" style={{ borderColor: "rgba(24,63,70,.55)", background: "rgba(24,63,70,.10)" }}>
            <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(24,63,70,.22)", color: "#F1E9DC" }}><Users size={20}/></span><ArrowUpRight size={16} style={{ color: "rgba(241,233,220,.35)" }}/></div>
            <h2 className="mt-5 text-xl font-black">{isArabic ? "الملف العام" : "Public profile"}</h2>
            <p className="mt-2 text-sm leading-6" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "اعرض هويتك وأعمالك كما يراها الجمهور." : "View your identity and work as the audience sees it."}</p>
          </a>
        </section>

        <section className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "أعمالك" : "Your work"}</p>
              <h2 className="mt-2 text-2xl font-black">{isArabic ? "المحتوى الحالي" : "Current publishing"}</h2>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {videos.length === 0 ? (
              <div className="rounded-2xl border p-8 text-sm" style={{ borderColor: "rgba(241,233,220,.07)", color: "rgba(241,233,220,.50)" }}>
                {isArabic ? "لا توجد أعمال حتى الآن." : "No works yet."}
              </div>
            ) : (
              videos.map((video) => (
                <div key={video.id} className="flex flex-col gap-4 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between" style={{ borderColor: "rgba(241,233,220,.07)" }}>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-bold">{video.title}</span>
                      <span className="rounded-full border px-2 py-1 text-[10px] uppercase tracking-[.16em]" style={{ borderColor: "rgba(241,233,220,.10)", color: "rgba(241,233,220,.44)" }}>
                        {video.content_type || "video"}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3 text-[10px]" style={{ color: "rgba(241,233,220,.43)" }}>
                      <span>{video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</span>
                      <span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span>
                      <span>{compact(video.likes)} {isArabic ? "إعجاب" : "likes"}</span>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2">
                    {video.published && (
                      <a href={`/${locale}/watch/${video.id}`} className="rounded-2xl border px-4 py-2 text-sm" style={{ borderColor: "rgba(241,233,220,.10)", color: "rgba(241,233,220,.72)" }}>
                        {isArabic ? "عرض" : "View"}
                      </a>
                    )}
                    <a href={`/${locale}/studio/content/${video.id}`} className="rounded-2xl border px-4 py-2 text-sm" style={{ borderColor: "rgba(24,63,70,.50)", color: "#F1E9DC" }}>
                      {isArabic ? "تحرير" : "Edit"}
                    </a>
                    <button type="button" onClick={() => void togglePublished(video)} disabled={updatingId === video.id} className="rounded-2xl bg-[#C47A52] px-4 py-2 text-sm font-bold text-[#090909] disabled:opacity-50">
                      {updatingId === video.id ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : video.published ? (isArabic ? "إلغاء النشر" : "Unpublish") : (isArabic ? "نشر" : "Publish")}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}

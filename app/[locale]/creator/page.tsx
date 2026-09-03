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

type StatCard = { icon: LucideIcon; label: string; value: string };

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
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
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
          setError(creatorError?.message || (isArabic ? "ملف المبدع غير موجود." : "Creator profile not found."));
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
        if (videoError) setError(videoError.message);
        else setVideos(videoData ?? []);
      } catch (requestError: unknown) {
        if (mounted) setError(requestError instanceof Error ? requestError.message : "Unable to load creator space.");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    void loadDashboard();
    return () => { mounted = false; };
  }, [isArabic, locale, supabase]);

  async function togglePublished(video: Video) {
    if (updatingId === video.id) return;
    setError("");
    setUpdatingId(video.id);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !creator) throw new Error(isArabic ? "انتهت جلسة الدخول." : "Your session has expired.");
      const nextValue = !video.published;
      const { error: updateError } = await supabase
        .from("videos")
        .update({ published: nextValue })
        .eq("id", video.id)
        .eq("user_id", user.id)
        .eq("creator_id", creator.id);
      if (updateError) throw updateError;
      setVideos((current) => current.map((item) => item.id === video.id ? { ...item, published: nextValue } : item));
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : "Unable to update this work.");
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-[#090909] px-5 py-20 text-[#F1E9DC]"><div className="mx-auto max-w-5xl text-center">{isArabic ? "جارٍ تحميل مساحة المبدع..." : "Loading Creator Space..."}</div></main>;
  }

  const published = videos.filter((video) => video.published).length;
  const totalViews = videos.reduce((total, video) => total + Number(video.views ?? 0), 0);
  const totalLikes = videos.reduce((total, video) => total + Number(video.likes ?? 0), 0);
  const creatorName = creator?.name || creator?.username || (isArabic ? "المبدع" : "Creator");
  const stats: StatCard[] = [
    { icon: BarChart3, label: isArabic ? "المشاهدات" : "Views", value: compact(totalViews) },
    { icon: Sparkles, label: isArabic ? "المنشور" : "Published", value: compact(published) },
    { icon: FileVideo2, label: isArabic ? "الأعمال" : "Works", value: compact(videos.length) },
    { icon: Heart, label: isArabic ? "الإعجابات" : "Likes", value: compact(totalLikes) },
  ];

  return (
    <PlatformShell active="creators" eyebrow={isArabic ? "مساحة المبدع" : "Creator Space"} title={isArabic ? `مساحة ${creatorName}` : `${creatorName}'s Creator Space`} description={isArabic ? "مساحة إدارة هادئة تضع عملك وأداءه قبل ضوضاء الـdashboard." : "A focused workspace that puts your work and its performance before dashboard noise."}>
      <div className="mx-auto max-w-[1440px] space-y-10 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && <div className="border-s-2 border-[#C47A52] bg-[#C47A52]/5 px-5 py-4 text-sm opacity-80">{error}</div>}

        <section className="ravine-dashboard-stats grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="border p-5" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.60)" }}>
              <span className="flex h-9 w-9 items-center justify-center rounded-[10px]" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}><Icon size={17} /></span>
              <div className="mt-5 text-3xl font-black">{value}</div>
              <div className="mt-1 text-xs opacity-45">{label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-x-8 gap-y-5 border-y py-7 md:grid-cols-3">
          <a href={`/${locale}/studio`} className="group border-s-2 border-transparent ps-5 transition hover:border-[#C47A52]">
            <div className="flex items-center gap-3"><Sparkles size={18} style={{ color: "#C47A52" }} /><h2 className="text-lg font-black">{isArabic ? "فتح Studio" : "Open Studio"}</h2><ArrowUpRight size={15} className="opacity-35" /></div>
            <p className="mt-2 text-sm leading-6 opacity-50">{isArabic ? "المساحة الرئيسية للمحتوى والتحليلات والملف." : "Your main workspace for content, analytics and profile."}</p>
          </a>
          <a href={`/${locale}/creator/upload`} className="group border-s-2 border-transparent ps-5 transition hover:border-[#C47A52]">
            <div className="flex items-center gap-3"><Plus size={18} style={{ color: "#C47A52" }} /><h2 className="text-lg font-black">{isArabic ? "رفع عمل" : "Upload work"}</h2><ArrowUpRight size={15} className="opacity-35" /></div>
            <p className="mt-2 text-sm leading-6 opacity-50">{isArabic ? "أضف فيديو أو Short أو Podcast كمسودة جديدة." : "Add a video, Short or Podcast as a new draft."}</p>
          </a>
          <a href={`/${locale}/creator/${creator?.username || creator?.id || ""}`} className="group border-s-2 border-transparent ps-5 transition hover:border-[#C47A52]">
            <div className="flex items-center gap-3"><Users size={18} style={{ color: "#C47A52" }} /><h2 className="text-lg font-black">{isArabic ? "الملف العام" : "Public profile"}</h2><ArrowUpRight size={15} className="opacity-35" /></div>
            <p className="mt-2 text-sm leading-6 opacity-50">{isArabic ? "اعرض هويتك وأعمالك كما يراها الجمهور." : "See your identity and work as the audience sees it."}</p>
          </a>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "أعمالك" : "YOUR WORK"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "المحتوى الحالي" : "Current publishing"}</h2></div>
            <span className="text-xs opacity-40">{videos.length} {isArabic ? "عمل" : "works"}</span>
          </div>
          <div className="divide-y" style={{ borderTop: "1px solid rgba(241,233,220,.08)" }}>
            {videos.length === 0 ? <div className="py-12 text-sm opacity-50">{isArabic ? "لا توجد أعمال حتى الآن." : "No works yet."}</div> : videos.map((video) => (
              <div key={video.id} className="ravine-dashboard-row flex flex-col gap-4 py-5 transition md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3"><span className="truncate text-sm font-bold">{video.title}</span><span className="text-[10px] uppercase tracking-[.16em] opacity-35">{video.content_type || "video"}</span></div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] opacity-40"><span>{video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</span><span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span><span>{compact(video.likes)} {isArabic ? "إعجاب" : "likes"}</span></div>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  {video.published && <a href={`/${locale}/watch/${video.id}`} className="px-3 py-2 text-xs font-semibold opacity-55 hover:opacity-100">{isArabic ? "عرض" : "View"}</a>}
                  <a href={`/${locale}/studio/content/${video.id}`} className="px-3 py-2 text-xs font-semibold opacity-55 hover:opacity-100">{isArabic ? "تحرير" : "Edit"}</a>
                  <button type="button" onClick={() => void togglePublished(video)} disabled={updatingId === video.id} className="rounded-full bg-[#C47A52] px-4 py-2 text-xs font-bold text-[#090909] disabled:opacity-50">{updatingId === video.id ? (isArabic ? "جارٍ الحفظ..." : "Saving...") : video.published ? (isArabic ? "إلغاء النشر" : "Unpublish") : (isArabic ? "نشر" : "Publish")}</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}

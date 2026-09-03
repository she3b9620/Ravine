"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, BarChart3, Clapperboard, FileVideo2, Heart, MessageCircle, Plus, Sparkles, Users, Video, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Profile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  is_creator: boolean | null;
};

type VideoRecord = {
  id: number;
  title: string;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  published: boolean | null;
  created_at: string | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
};

type Comment = {
  id: number;
  content: string;
  created_at: string | null;
  video_id: number;
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

export default function CreatorsHubPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (!mounted) return;
      if (userError || !userData.user) {
        window.location.href = `/${locale}/auth?next=/${locale}/creators-hub`;
        return;
      }

      const [{ data: profileData, error: profileError }, { data: videoData, error: videoError }, { data: commentData, error: commentError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,username,avatar_url,is_verified,is_creator")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("videos")
          .select("id,title,thumbnail_url,views,likes,published,created_at,content_type")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(8),
        supabase
          .from("comments")
          .select("id,content,created_at,video_id")
          .order("created_at", { ascending: false })
          .limit(6),
      ]);

      if (!mounted) return;

      const firstError = userError || profileError || videoError || commentError;
      if (firstError) setError(firstError.message);
      setProfile(profileData ?? null);
      setVideos(videoData ?? []);
      setComments(commentData ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [locale, supabase]);

  const published = videos.filter((video) => video.published).length;
  const totalViews = videos.reduce((sum, video) => sum + Number(video.views ?? 0), 0);
  const totalLikes = videos.reduce((sum, video) => sum + Number(video.likes ?? 0), 0);
  const creatorName = profile?.display_name || profile?.username || (isArabic ? "المبدع" : "Creator");

  const statCards: StatCard[] = [
    { icon: FileVideo2, label: isArabic ? "الأعمال" : "Works", value: loading ? "—" : compact(videos.length) },
    { icon: BarChart3, label: isArabic ? "المشاهدات" : "Views", value: loading ? "—" : compact(totalViews) },
    { icon: Heart, label: isArabic ? "الإعجابات" : "Likes", value: loading ? "—" : compact(totalLikes) },
    { icon: Sparkles, label: isArabic ? "المنشور" : "Published", value: loading ? "—" : compact(published) },
  ];

  if (!loading && profile && !profile.is_creator) {
    return (
      <PlatformShell active="creators" eyebrow={isArabic ? "للمبدعين" : "For creators"} title={isArabic ? "حوّل حسابك إلى مساحة صناعة." : "Turn your account into a creator space."}>
        <div className="mx-auto max-w-5xl px-5 pb-16 pt-8 md:px-8 lg:px-10">
          <div className="rounded-[34px] border p-8 md:p-12" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.28),rgba(21,23,25,.82))" }}>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.12)", color: "#C47A52" }}><Sparkles size={22} /></div>
            <h2 className="mt-6 text-3xl font-black md:text-5xl">{isArabic ? "طبقة المبدع تبدأ من حسابك الحالي." : "The creator layer starts from your existing account."}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>
              {isArabic ? "فعّل وضع المبدع من صفحة المبدع لفتح الاستوديو، النشر، التحليلات، البودكاست والبث." : "Enable creator mode from your creator page to unlock Studio, publishing, analytics, podcasts and live."}
            </p>
            <a href={`/${locale}/creator`} className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}>
              {isArabic ? "الانتقال إلى مساحة المبدع" : "Open creator setup"}<ArrowUpRight size={15} />
            </a>
          </div>
        </div>
      </PlatformShell>
    );
  }

  return (
    <PlatformShell active="creators" eyebrow={isArabic ? "Creators Hub" : "Creators Hub"} title={isArabic ? `مساحة ${creatorName}` : `${creatorName}'s creator space`} description={isArabic ? "لوحة يومية تجمع أعمالك، إشارات الأداء، والنقاشات القريبة من شغلك." : "A focused workspace for your work, performance signals and conversations around what you make."}>
      <div className="mx-auto max-w-[1440px] space-y-8 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && <div className="rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>{isArabic ? "تعذر تحميل بعض بيانات مساحة المبدع." : "Some creator data could not be loaded."}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.76)" }}>
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}><Icon size={18} /></span><span className="text-[10px] uppercase tracking-[.22em]" style={{ color: "rgba(241,233,220,.38)" }}>RAVINE</span></div>
              <div className="mt-5 text-3xl font-black">{value}</div>
              <div className="mt-1 text-xs" style={{ color: "rgba(241,233,220,.50)" }}>{label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <div className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.28),rgba(21,23,25,.80))" }}>
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "مساحة العمل" : "Workspace"}</p><h2 className="mt-2 text-3xl font-black">{isArabic ? "انشر شيئًا جديدًا." : "Publish something new."}</h2><p className="mt-3 max-w-xl text-sm leading-7" style={{ color: "rgba(241,233,220,.56)" }}>{isArabic ? "كل ما تنشره يبدأ هنا: عمل طويل، Cut أو مشروع صوتي عندما تفتحه المنصة لك." : "Everything you publish starts here: a work, a Cut, or an audio project when your creator layer supports it."}</p></div>
              <a href={`/${locale}/creator/upload`} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}><Plus size={16}/>{isArabic ? "رفع عمل" : "Upload work"}</a>
            </div>
          </div>

          <div className="rounded-[32px] border p-6" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.76)" }}>
            <div className="flex items-center gap-2 text-sm font-bold"><Users size={17} style={{ color: "#C47A52" }}/>{isArabic ? "هوية المبدع" : "Creator identity"}</div>
            <div className="mt-5 flex items-center gap-4">
              {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-14 w-14 rounded-2xl object-cover" /> : <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "linear-gradient(135deg,#183F46,#C47A52)" }}><Users size={22}/></div>}
              <div><div className="font-bold">{creatorName}</div><div className="mt-1 text-xs" style={{ color: "rgba(241,233,220,.48)" }}>{profile?.username ? `@${profile.username}` : (isArabic ? "أكمل ملفك" : "Complete your profile")}</div></div>
            </div>
            <a href={`/${locale}/creator`} className="mt-5 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "تعديل الهوية" : "Edit identity"}<ArrowUpRight size={13}/></a>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "أعمالي" : "My work"}</p><h2 className="mt-2 text-3xl font-black">{isArabic ? "أحدث ما نشرت" : "Latest published work"}</h2></div><a href={`/${locale}/creator`} className="text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "إدارة الملف" : "Manage profile"}</a></div>
          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.62)" }}/>)}</div>
          ) : videos.length === 0 ? (
            <div className="rounded-[30px] border p-8 text-center" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.72)" }}><Video size={22} style={{ margin: "0 auto", color: "#C47A52" }}/><h3 className="mt-4 text-xl font-bold">{isArabic ? "لسه مفيش أعمال هنا." : "No work here yet."}</h3><p className="mt-2 text-sm" style={{ color: "rgba(241,233,220,.50)" }}>{isArabic ? "ابدأ برفع أول عمل ليظهر في مساحتك." : "Upload your first work to populate your creator space."}</p></div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{videos.slice(0,4).map((video) => <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.76)" }}><div className="aspect-[16/10] overflow-hidden" style={{ background: "#111516" }}>{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105"/> : <div className="h-full w-full" style={{ background: "linear-gradient(135deg,#183F46,#C47A52)" }}/>}</div><div className="p-4"><div className="flex items-center justify-between text-[10px]" style={{ color: "rgba(241,233,220,.46)" }}><span>{video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</span><span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span></div><h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6">{video.title}</h3><div className="mt-4 flex items-center gap-3 text-[10px]" style={{ color: "rgba(241,233,220,.46)" }}><span className="inline-flex items-center gap-1"><Heart size={11}/>{compact(video.likes)}</span><span className="inline-flex items-center gap-1"><MessageCircle size={11}/>{comments.length}</span></div></div></a>)}</div>
          )}
        </section>

        <section className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
          <div className="flex items-center gap-2"><MessageCircle size={17} style={{ color: "#C47A52" }}/><h2 className="text-xl font-black">{isArabic ? "نبض المجتمع" : "Community pulse"}</h2></div>
          <p className="mt-2 text-sm" style={{ color: "rgba(241,233,220,.50)" }}>{isArabic ? "آخر النقاشات الموجودة على المنصة." : "Recent conversations happening across RAVINE."}</p>
          {comments.length ? <div className="mt-5 grid gap-3 md:grid-cols-2">{comments.slice(0,4).map((comment) => <div key={comment.id} className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(241,233,220,.025)" }}><p className="line-clamp-2 text-sm leading-6">{comment.content}</p><div className="mt-3 text-[10px]" style={{ color: "rgba(241,233,220,.40)" }}>{isArabic ? "تعليق على عمل" : `Comment on work #${comment.video_id}`}</div></div>)}</div> : <div className="mt-5 rounded-2xl border p-5 text-sm" style={{ borderColor: "rgba(241,233,220,.08)", color: "rgba(241,233,220,.48)" }}>{isArabic ? "مفيش نقاشات حديثة لسه." : "No recent conversations yet."}</div>}
        </section>
      </div>
    </PlatformShell>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, BarChart3, FileVideo2, Heart, LayoutDashboard, MessageCircle, Plus, Settings2, Sparkles, Users, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Profile = {
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_creator: boolean | null;
};

type StudioVideo = {
  id: number;
  title: string;
  views: number | null;
  likes: number | null;
  published: boolean | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
  created_at: string | null;
};

type StudioCard = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
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

export default function StudioPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [videos, setVideos] = useState<StudioVideo[]>([]);
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
        window.location.href = `/${locale}/auth?next=/${locale}/studio`;
        return;
      }

      const [{ data: profileData, error: profileError }, { data: videoData, error: videoError }] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name,username,avatar_url,is_creator")
          .eq("id", userData.user.id)
          .maybeSingle(),
        supabase
          .from("videos")
          .select("id,title,views,likes,published,content_type,created_at")
          .eq("user_id", userData.user.id)
          .order("created_at", { ascending: false })
          .limit(12),
      ]);

      if (!mounted) return;

      const firstError = userError || profileError || videoError;
      if (firstError) setError(firstError.message);
      setProfile(profileData ?? null);
      setVideos(videoData ?? []);
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

  if (!loading && profile && !profile.is_creator) {
    return (
      <PlatformShell eyebrow={isArabic ? "استوديو RAVINE" : "RAVINE Studio"} title={isArabic ? "الاستوديو للمبدعين." : "Studio is for creators."}>
        <div className="mx-auto max-w-4xl px-5 pb-16 pt-8 md:px-8 lg:px-10">
          <div className="rounded-[34px] border p-8 md:p-12" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.28),rgba(21,23,25,.82))" }}>
            <Sparkles size={24} style={{ color: "#C47A52" }} />
            <h2 className="mt-5 text-3xl font-black md:text-5xl">{isArabic ? "حوّل حسابك إلى مبدع أولًا." : "Become a creator first."}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>{isArabic ? "الاستوديو يفتح بعد تفعيل طبقة المبدع في حسابك، بدون إنشاء حساب منفصل." : "Studio unlocks after creator mode is enabled on your existing account—no separate account required."}</p>
            <a href={`/${locale}/creator`} className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}>{isArabic ? "تفعيل المبدع" : "Open creator setup"}<ArrowUpRight size={15} /></a>
          </div>
        </div>
      </PlatformShell>
    );
  }

  const cards: StudioCard[] = [
    { icon: FileVideo2, title: isArabic ? "المحتوى" : "Content", description: isArabic ? "إدارة الأعمال، الـCuts والمسودات والنشر." : "Manage works, Cuts, drafts and publishing.", href: `/${locale}/studio/content` },
    { icon: BarChart3, title: isArabic ? "التحليلات" : "Analytics", description: isArabic ? "راقب المشاهدة، التفاعل وأداء أعمالك." : "Track views, engagement and work performance.", href: `/${locale}/studio/analytics` },
    { icon: Users, title: isArabic ? "الملف" : "Profile", description: isArabic ? "طوّر هويتك المهنية وروابطك ومعلوماتك." : "Shape your professional identity, links and details.", href: `/${locale}/studio/profile` },
  ];

  const statCards: StatCard[] = [
    { icon: LayoutDashboard, label: isArabic ? "الأعمال" : "Works", value: loading ? "—" : compact(videos.length) },
    { icon: BarChart3, label: isArabic ? "المشاهدات" : "Views", value: loading ? "—" : compact(totalViews) },
    { icon: Heart, label: isArabic ? "الإعجابات" : "Likes", value: loading ? "—" : compact(totalLikes) },
    { icon: Sparkles, label: isArabic ? "المنشور" : "Published", value: loading ? "—" : compact(published) },
  ];

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Studio" title={isArabic ? `استوديو ${creatorName}` : `${creatorName}'s Studio`} description={isArabic ? "المكان الذي تتحول فيه الصفحة إلى عملية صناعة ونشر وإدارة." : "The place where your profile becomes a system for making, publishing and managing work."}>
      <div className="mx-auto max-w-[1440px] space-y-8 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && <div className="rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>{isArabic ? "تعذر تحميل بعض بيانات الاستوديو." : "Some studio data could not be loaded."}</div>}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.76)" }}>
              <div className="flex items-center justify-between"><span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}><Icon size={18} /></span><span className="text-[10px] uppercase tracking-[.22em]" style={{ color: "rgba(241,233,220,.38)" }}>STUDIO</span></div>
              <div className="mt-5 text-3xl font-black">{value}</div>
              <div className="mt-1 text-xs" style={{ color: "rgba(241,233,220,.50)" }}>{label}</div>
            </div>
          ))}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          {cards.map(({ icon: Icon, title, description, href }) => (
            <a key={href} href={href} className="group rounded-[30px] border p-6 transition hover:-translate-y-1" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
              <div className="flex items-center justify-between"><span className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.10)", color: "#C47A52" }}><Icon size={20} /></span><ArrowUpRight size={16} style={{ color: "rgba(241,233,220,.35)" }} /></div>
              <h2 className="mt-5 text-xl font-black">{title}</h2>
              <p className="mt-2 text-sm leading-6" style={{ color: "rgba(241,233,220,.52)" }}>{description}</p>
            </a>
          ))}
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
          <div className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.24),rgba(21,23,25,.80))" }}>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "ابدأ من هنا" : "Start here"}</p><h2 className="mt-2 text-3xl font-black">{isArabic ? "انشر عملك التالي." : "Publish your next work."}</h2><p className="mt-3 max-w-xl text-sm leading-7" style={{ color: "rgba(241,233,220,.55)" }}>{isArabic ? "ارفع نسخة جديدة أو ارجع لمسودة سابقة واستكمل من حيث توقفت." : "Upload something new or return to a previous draft and continue where you left off."}</p></div>
              <a href={`/${locale}/creator/upload`} className="inline-flex shrink-0 items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}><Plus size={16}/>{isArabic ? "رفع عمل" : "Upload work"}</a>
            </div>
          </div>

          <div className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
            <div className="flex items-center gap-2 text-sm font-bold"><Settings2 size={17} style={{ color: "#C47A52" }}/>{isArabic ? "اختصارات" : "Quick links"}</div>
            <div className="mt-5 space-y-2"><a href={`/${locale}/creators-hub`} className="flex items-center justify-between rounded-2xl p-3 text-sm" style={{ background: "rgba(241,233,220,.025)" }}>{isArabic ? "الـCreator Hub" : "Creator Hub"}<ArrowUpRight size={14}/></a><a href={`/${locale}/creator`} className="flex items-center justify-between rounded-2xl p-3 text-sm" style={{ background: "rgba(241,233,220,.025)" }}>{isArabic ? "الهوية العامة" : "Public identity"}<ArrowUpRight size={14}/></a><a href={`/${locale}/studio/profile`} className="flex items-center justify-between rounded-2xl p-3 text-sm" style={{ background: "rgba(241,233,220,.025)" }}>{isArabic ? "إعدادات الملف" : "Profile settings"}<ArrowUpRight size={14}/></a></div>
          </div>
        </section>

        <section className="rounded-[32px] border p-6 md:p-8" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.74)" }}>
          <div className="flex items-end justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "آخر الأعمال" : "Recent work"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "ما تنشره الآن" : "What you are publishing now"}</h2></div><a href={`/${locale}/studio/content`} className="text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "إدارة الكل" : "Manage all"}</a></div>
          {loading ? <div className="mt-5 grid gap-3 md:grid-cols-3">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-20 animate-pulse rounded-2xl" style={{ background: "rgba(241,233,220,.035)" }}/>)}</div> : videos.length ? <div className="mt-5 grid gap-3 md:grid-cols-3">{videos.slice(0,6).map((video) => <a key={video.id} href={`/${locale}/watch/${video.id}`} className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.07)" }}><div className="flex items-center justify-between gap-3"><span className="truncate text-sm font-bold">{video.title}</span><ArrowUpRight size={14} style={{ color: "rgba(241,233,220,.34)" }}/></div><div className="mt-2 flex items-center gap-3 text-[10px]" style={{ color: "rgba(241,233,220,.43)" }}><span>{video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</span><span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span><span>{compact(video.likes)} {isArabic ? "إعجاب" : "likes"}</span></div></a>)}</div> : <div className="mt-5 rounded-2xl border p-6 text-sm" style={{ borderColor: "rgba(241,233,220,.07)", color: "rgba(241,233,220,.5)" }}>{isArabic ? "لسه مفيش أعمال في الاستوديو." : "No work in the studio yet."}</div>}
        </section>

        <section className="flex flex-wrap gap-3 rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(241,233,220,.02)" }}>
          <a href={`/${locale}/studio/analytics`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold" style={{ borderColor: "rgba(241,233,220,.10)" }}><BarChart3 size={14}/>{isArabic ? "افتح التحليلات" : "Open analytics"}</a>
          <a href={`/${locale}/creators-hub`} className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold" style={{ borderColor: "rgba(241,233,220,.10)" }}><MessageCircle size={14}/>{isArabic ? "نبض المجتمع" : "Community pulse"}</a>
        </section>
      </div>
    </PlatformShell>
  );
}

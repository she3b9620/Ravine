"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { ArrowUpRight, BarChart3, Eye, FileVideo2, Heart, MessageCircle, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = { id: number; title: string; views: number | null; likes: number | null; published: boolean | null; content_type: "short" | "video" | "podcast" | "live" | null };
type Comment = { id: number };

function compact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

export default function StudioAnalyticsPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<Video[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!userData.user) { window.location.href = `/${locale}/auth?next=/${locale}/studio/analytics`; return; }
      const [{ data: videoData, error: videoError }, { data: commentData, error: commentError }] = await Promise.all([
        supabase.from("videos").select("id,title,views,likes,published,content_type").eq("user_id", userData.user.id).order("views", { ascending: false }),
        supabase.from("comments").select("id").eq("user_id", userData.user.id),
      ]);
      if (!mounted) return;
      if (videoError || commentError) setError((videoError || commentError)?.message || "");
      setVideos(videoData ?? []);
      setComments(commentData ?? []);
      setLoading(false);
    }
    void load();
    return () => { mounted = false; };
  }, [locale, supabase]);

  const views = videos.reduce((sum, item) => sum + Number(item.views ?? 0), 0);
  const likes = videos.reduce((sum, item) => sum + Number(item.likes ?? 0), 0);
  const published = videos.filter((item) => item.published).length;
  const engagement = views ? ((likes / views) * 100) : 0;
  const top = videos.slice(0, 5);
  const metrics = [
    { icon: Eye, label: isArabic ? "إجمالي المشاهدات" : "Total views", value: loading ? "—" : compact(views) },
    { icon: Heart, label: isArabic ? "الإعجابات" : "Likes", value: loading ? "—" : compact(likes) },
    { icon: MessageCircle, label: isArabic ? "التعليقات" : "Comments", value: loading ? "—" : compact(comments.length) },
    { icon: BarChart3, label: isArabic ? "معدل الإعجاب" : "Like rate", value: loading ? "—" : `${engagement.toFixed(1)}%` },
  ];

  return (
    <PlatformShell active="creators" eyebrow="RAVINE Studio" title={isArabic ? "التحليلات" : "Analytics"} description={isArabic ? "قراءة أولية لأداء أعمالك من البيانات الموجودة داخل RAVINE." : "A focused first view of your work performance using the data already inside RAVINE."}>
      <div className="mx-auto max-w-[1440px] space-y-6 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && <div className="rounded-3xl border px-5 py-4 text-sm" style={{borderColor:"rgba(196,122,82,.35)",background:"rgba(196,122,82,.08)"}}>{isArabic ? "تعذر تحميل بعض التحليلات." : "Some analytics could not be loaded."}</div>}
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map(({icon:Icon,label,value}) => <div key={label} className="rounded-[28px] border p-5" style={{borderColor:"rgba(241,233,220,.10)",background:"rgba(21,23,25,.76)"}}><span className="flex h-10 w-10 items-center justify-center rounded-2xl" style={{background:"rgba(196,122,82,.10)",color:"#C47A52"}}><Icon size={18}/></span><div className="mt-5 text-3xl font-black">{value}</div><div className="mt-1 text-xs" style={{color:"rgba(241,233,220,.48)"}}>{label}</div></div>)}
        </section>
        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[32px] border p-6 md:p-8" style={{borderColor:"rgba(241,233,220,.10)",background:"rgba(21,23,25,.74)"}}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{color:"#C47A52"}}>{isArabic ? "الأداء" : "Performance"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "أفضل الأعمال" : "Top performing work"}</h2></div><span className="rounded-full px-3 py-1.5 text-[10px]" style={{background:"rgba(241,233,220,.05)",color:"rgba(241,233,220,.45)"}}>{published} {isArabic ? "منشور" : "published"}</span></div>
            {loading ? <div className="mt-6 space-y-3">{Array.from({length:5}).map((_,i)=><div key={i} className="h-16 animate-pulse rounded-2xl" style={{background:"rgba(241,233,220,.035)"}}/>)}</div> : top.length ? <div className="mt-6 space-y-2">{top.map((video,index)=><a key={video.id} href={`/${locale}/watch/${video.id}`} className="flex items-center gap-4 rounded-2xl border p-4" style={{borderColor:"rgba(241,233,220,.06)"}}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black" style={{background:"rgba(24,63,70,.30)",color:"#F1E9DC"}}>{index+1}</span><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{video.title}</div><div className="mt-1 text-[10px]" style={{color:"rgba(241,233,220,.40)"}}>{video.content_type || "video"} · {video.published ? (isArabic ? "منشور" : "Published") : (isArabic ? "مسودة" : "Draft")}</div></div><div className="text-right"><div className="text-sm font-black">{compact(Number(video.views||0))}</div><div className="text-[10px]" style={{color:"rgba(241,233,220,.38)"}}>{isArabic ? "مشاهدة" : "views"}</div></div><ArrowUpRight size={14} style={{color:"rgba(241,233,220,.32)"}}/></a>)}</div> : <div className="py-14 text-center"><FileVideo2 size={24} className="mx-auto" style={{color:"#C47A52"}}/><p className="mt-4 text-sm" style={{color:"rgba(241,233,220,.45)"}}>{isArabic ? "ستظهر التحليلات بعد نشر أعمالك." : "Analytics will appear as you publish work."}</p></div>}
          </div>
          <div className="rounded-[32px] border p-6 md:p-8" style={{borderColor:"rgba(241,233,220,.10)",background:"linear-gradient(145deg,rgba(24,63,70,.20),rgba(21,23,25,.80))"}}>
            <p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{color:"#C47A52"}}>{isArabic ? "ملاحظة" : "Signal"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "الأرقام تبدأ بالحكاية، مش بتنهيها." : "Numbers start the story. They don't finish it."}</h2><p className="mt-4 text-sm leading-7" style={{color:"rgba(241,233,220,.52)"}}>{isArabic ? "هذه نسخة MVP من التحليلات. البنية جاهزة لإضافة بيانات زمنية، الاحتفاظ بالمشاهدين ومصادر الزيارات لاحقًا بدون تغيير تجربة الاستوديو." : "This is the MVP analytics layer. The workspace is ready for time-series data, retention and traffic sources later without changing the Studio surface."}</p>
            <div className="mt-7 grid grid-cols-2 gap-3"><div className="rounded-2xl p-4" style={{background:"rgba(9,9,9,.28)"}}><Users size={16} style={{color:"#C47A52"}}/><div className="mt-3 text-xl font-black">—</div><div className="mt-1 text-[10px]" style={{color:"rgba(241,233,220,.40)"}}>{isArabic ? "المتابعون" : "Followers"}</div></div><div className="rounded-2xl p-4" style={{background:"rgba(9,9,9,.28)"}}><BarChart3 size={16} style={{color:"#C47A52"}}/><div className="mt-3 text-xl font-black">MVP</div><div className="mt-1 text-[10px]" style={{color:"rgba(241,233,220,.40)"}}>{isArabic ? "مرحلة التحليلات" : "Analytics stage"}</div></div></div>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}

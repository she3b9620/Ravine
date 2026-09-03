"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import {
  ArrowUpRight,
  Clapperboard,
  Heart,
  MessageCircle,
  Play,
  Sparkles,
  Users,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type CommunityVideo = {
  id: number;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
  content_type: "short" | "video" | "podcast" | "live" | null;
};

type Creator = {
  id: number;
  name: string;
  username: string | null;
  avatar_url: string | null;
  specialty: string | null;
  followers: number | null;
};

type Comment = {
  id: number;
  content: string;
  created_at: string | null;
  video_id: number;
};

function compact(value: number | null | undefined) {
  const n = Number(value ?? 0);
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function timeAgo(value: string | null, isArabic: boolean) {
  if (!value) return isArabic ? "منذ فترة" : "Earlier";
  const diff = Math.max(0, Date.now() - new Date(value).getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return isArabic ? `منذ ${minutes || 1} دقيقة` : `${minutes || 1}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return isArabic ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return isArabic ? `منذ ${days} يوم` : `${days}d ago`;
}

export default function CommunityPage() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [videos, setVideos] = useState<CommunityVideo[]>([]);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError("");

      const [videoResult, creatorResult, commentResult] = await Promise.all([
        supabase
          .from("videos")
          .select("id,title,description,thumbnail_url,views,likes,created_at,content_type")
          .eq("published", true)
          .order("created_at", { ascending: false })
          .limit(6),
        supabase
          .from("creators")
          .select("id,name,username,avatar_url,specialty,followers")
          .order("followers", { ascending: false })
          .limit(5),
        supabase
          .from("comments")
          .select("id,content,created_at,video_id")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      if (!mounted) return;

      const firstError = videoResult.error || creatorResult.error || commentResult.error;
      if (firstError) setError(firstError.message);
      setVideos(videoResult.data ?? []);
      setCreators(creatorResult.data ?? []);
      setComments(commentResult.data ?? []);
      setLoading(false);
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const featured = videos[0] ?? null;
  const latest = videos.slice(1, 5);
  const discussion = comments.slice(0, 4);

  return (
    <PlatformShell
      active=""
      eyebrow={isArabic ? "مجتمع RAVINE" : "RAVINE Community"}
      title={isArabic ? "المكان الذي لا يكتفي بالمشاهدة." : "A community built around the work."}
      description={
        isArabic
          ? "تابع ما يحدث حول الأعمال والمبدعين، شارك في الحوار، واكتشف أشخاصًا يشبههم شغفهم بما تصنع."
          : "Follow what is happening around the work, join the conversation, and discover people who care about making things well."
      }
    >
      <div className="mx-auto max-w-[1440px] space-y-10 px-5 pb-16 pt-8 md:px-8 lg:px-10">
        {error && (
          <div className="rounded-3xl border px-5 py-4 text-sm" style={{ borderColor: "rgba(196,122,82,.35)", background: "rgba(196,122,82,.08)" }}>
            {isArabic ? "تعذر تحميل جزء من بيانات المجتمع حاليًا." : "Some community data could not be loaded right now."}
          </div>
        )}

        <section className="grid gap-5 lg:grid-cols-[1.45fr_.8fr]">
          <article className="group relative min-h-[460px] overflow-hidden rounded-[32px] border" style={{ borderColor: "rgba(241,233,220,.10)", background: "#111516" }}>
            {featured?.thumbnail_url ? (
              <img src={featured.thumbnail_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-700 group-hover:scale-[1.03]" />
            ) : (
              <div className="absolute inset-0" style={{ background: "radial-gradient(circle at 70% 20%, rgba(196,122,82,.28), transparent 28%), linear-gradient(135deg,#183F46,#111516 55%,#090909)" }} />
            )}
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,9,.92),rgba(9,9,9,.48),rgba(9,9,9,.12))]" />
            <div className="relative flex min-h-[460px] max-w-2xl flex-col justify-end p-7 md:p-10">
              <div className="mb-auto flex items-center gap-2 pt-1 text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "#C47A52" }}>
                <Sparkles size={13} />
                {isArabic ? "في قلب المجتمع" : "Community spotlight"}
              </div>
              <div>
                <span className="inline-flex rounded-full border px-3 py-1.5 text-[10px] font-bold" style={{ borderColor: "rgba(241,233,220,.14)", background: "rgba(9,9,9,.32)" }}>
                  {featured?.content_type === "live" ? "LIVE" : isArabic ? "عمل جديد" : "New work"}
                </span>
                <h2 className="mt-4 max-w-xl text-3xl font-black tracking-[-.035em] md:text-5xl">
                  {featured?.title || (isArabic ? "ابدأ من العمل، ثم قابل الناس خلفه." : "Start with the work, then meet the people behind it.")}
                </h2>
                <p className="mt-4 max-w-lg text-sm leading-7" style={{ color: "rgba(241,233,220,.62)" }}>
                  {featured?.description ||
                    (isArabic
                      ? "المجتمع هنا مساحة حول الصناعة والفضول والتجربة، لا مجرد أرقام تفاعل."
                      : "A space for craft, curiosity and process—not just engagement numbers.")}
                </p>
                {featured && (
                  <a href={`/${locale}/watch/${featured.id}`} className="mt-7 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}>
                    <Play size={15} fill="currentColor" />
                    {isArabic ? "شاهد العمل" : "Watch work"}
                    <ArrowUpRight size={15} />
                  </a>
                )}
              </div>
            </div>
          </article>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-[30px] border p-6" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(145deg,rgba(24,63,70,.35),rgba(21,23,25,.78))" }}>
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#C47A52" }}><Users size={15} />{isArabic ? "غرفة المبدعين" : "Creators Hub"}</div>
              <h3 className="mt-4 text-2xl font-black">{isArabic ? "مكان لصنّاع العمل، لا للمتفرجين فقط." : "A room for makers, not just viewers."}</h3>
              <p className="mt-3 text-sm leading-6" style={{ color: "rgba(241,233,220,.55)" }}>{isArabic ? "نقاشات العمل، التعاون، الكواليس، والتجارب بين المبدعين." : "Process, collaboration, behind-the-scenes, and creator-to-creator conversations."}</p>
              <a href={`/${locale}/creator`} className="mt-5 inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "اكتشف مساحة المبدعين" : "Explore the creator space"} <ArrowUpRight size={14} /></a>
            </div>

            <div className="rounded-[30px] border p-6" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.78)" }}>
              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#C47A52" }}><Clapperboard size={15} />{isArabic ? "إشارات اليوم" : "Signals"}</div>
              <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-2xl p-3" style={{ background: "rgba(241,233,220,.035)" }}><div className="text-xl font-black">{loading ? "—" : compact(videos.length)}</div><div className="mt-1 text-[10px]" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "أعمال" : "Works"}</div></div>
                <div className="rounded-2xl p-3" style={{ background: "rgba(241,233,220,.035)" }}><div className="text-xl font-black">{loading ? "—" : compact(creators.length)}</div><div className="mt-1 text-[10px]" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "مبدعون" : "Creators"}</div></div>
                <div className="rounded-2xl p-3" style={{ background: "rgba(241,233,220,.035)" }}><div className="text-xl font-black">{loading ? "—" : compact(comments.length)}</div><div className="mt-1 text-[10px]" style={{ color: "rgba(241,233,220,.52)" }}>{isArabic ? "نقاشات" : "Talks"}</div></div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.25em]" style={{ color: "#C47A52" }}>{isArabic ? "آخر الحركة" : "Latest movement"}</p>
              <h2 className="mt-2 text-3xl font-black">{isArabic ? "أعمال بدأت حوارًا" : "Work that started a conversation"}</h2>
            </div>
            <a href={`/${locale}/videos`} className="text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "كل الأعمال" : "All work"}</a>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-64 animate-pulse rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.08)", background: "rgba(21,23,25,.6)" }} />)
              : latest.map((video) => (
                  <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.78)" }}>
                    <div className="aspect-[16/10] overflow-hidden" style={{ background: "#111516" }}>
                      {video.thumbnail_url ? <img src={video.thumbnail_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <div className="h-full w-full" style={{ background: "linear-gradient(135deg,#183F46,#C47A52)" }} />}
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between gap-3 text-[10px]" style={{ color: "rgba(241,233,220,.48)" }}><span>{timeAgo(video.created_at, isArabic)}</span><span>{compact(video.views)} {isArabic ? "مشاهدة" : "views"}</span></div>
                      <h3 className="mt-3 line-clamp-2 text-sm font-bold leading-6">{video.title}</h3>
                      <div className="mt-4 flex items-center gap-4 text-[10px]" style={{ color: "rgba(241,233,220,.48)" }}><span className="inline-flex items-center gap-1"><Heart size={12} />{compact(video.likes)}</span><span className="inline-flex items-center gap-1"><Video size={12} />{video.content_type || "video"}</span></div>
                    </div>
                  </a>
                ))}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-[30px] border p-6 md:p-7" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.75)" }}>
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "#C47A52" }}>{isArabic ? "أحدث النقاشات" : "Recent conversations"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "صوت المجتمع" : "Community voice"}</h2></div><MessageCircle size={20} style={{ color: "#C47A52" }} /></div>
            <div className="mt-6 space-y-3">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl" style={{ background: "rgba(241,233,220,.035)" }} />)
                : discussion.length
                  ? discussion.map((comment) => <div key={comment.id} className="rounded-2xl border p-4" style={{ borderColor: "rgba(241,233,220,.07)", background: "rgba(241,233,220,.025)" }}><p className="text-sm leading-6">{comment.content}</p><p className="mt-2 text-[10px]" style={{ color: "rgba(241,233,220,.42)" }}>{timeAgo(comment.created_at, isArabic)}</p></div>)
                  : <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: "rgba(241,233,220,.07)", color: "rgba(241,233,220,.55)" }}>{isArabic ? "لسه مفيش نقاشات هنا. كن أول صوت." : "No conversations yet. Be the first voice."}</div>}
            </div>
          </div>

          <div className="rounded-[30px] border p-6 md:p-7" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.75)" }}>
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "#C47A52" }}>{isArabic ? "أصوات بارزة" : "People to know"}</p><h2 className="mt-2 text-2xl font-black">{isArabic ? "مبدعون يستحقون المتابعة" : "Creators worth following"}</h2></div><Users size={20} style={{ color: "#C47A52" }} /></div>
            <div className="mt-5 space-y-2">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-14 animate-pulse rounded-2xl" style={{ background: "rgba(241,233,220,.035)" }} />)
                : creators.length
                  ? creators.map((creator) => <a key={creator.id} href={creator.username ? `/${locale}/creator/${creator.username}` : `/${locale}/creators`} className="flex items-center gap-3 rounded-2xl p-3 transition hover:-translate-y-0.5" style={{ background: "rgba(241,233,220,.025)" }}><div className="h-11 w-11 shrink-0 overflow-hidden rounded-full" style={{ background: "linear-gradient(135deg,#183F46,#C47A52)" }}>{creator.avatar_url ? <img src={creator.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-xs font-black">R</div>}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-bold">{creator.name}</div><div className="mt-1 text-[10px]" style={{ color: "rgba(241,233,220,.45)" }}>{creator.specialty || (isArabic ? "صانع محتوى" : "Creator")} · {compact(creator.followers)} {isArabic ? "متابع" : "followers"}</div></div><ArrowUpRight size={15} style={{ color: "rgba(241,233,220,.38)" }} /></a>)
                  : <div className="rounded-2xl border p-5 text-sm" style={{ borderColor: "rgba(241,233,220,.07)", color: "rgba(241,233,220,.55)" }}>{isArabic ? "ابدأ باكتشاف المبدعين." : "Start by discovering creators."}</div>}
            </div>
          </div>
        </section>

        <section className="rounded-[32px] border p-7 md:p-10" style={{ borderColor: "rgba(241,233,220,.10)", background: "linear-gradient(135deg,rgba(24,63,70,.42),rgba(196,122,82,.08),rgba(21,23,25,.78))" }}>
          <div className="max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[.26em]" style={{ color: "#C47A52" }}>{isArabic ? "دورك في RAVINE" : "Your place in RAVINE"}</p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">{isArabic ? "المجتمع يبدأ من العمل." : "Community starts with the work."}</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>{isArabic ? "اتفرج، اتفاعل، تابع الناس اللي بتصنع حاجات تستاهل، ولما يكون عندك حاجة تقولها أو تصنعها—مكانك موجود." : "Watch, respond, follow people who make things worth seeing, and when you have something to say or make—there is a place for it here."}</p>
            <div className="mt-6 flex flex-wrap gap-3"><a href={`/${locale}/creators`} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold" style={{ background: "#C47A52", color: "#090909" }}><Users size={15} />{isArabic ? "اكتشف المبدعين" : "Discover creators"}</a><a href={`/${locale}/creator`} className="inline-flex items-center gap-2 rounded-full border px-5 py-3 text-sm font-semibold" style={{ borderColor: "rgba(241,233,220,.15)" }}>{isArabic ? "كن مبدعًا" : "Become a Creator"}<ArrowUpRight size={15} /></a></div>
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}

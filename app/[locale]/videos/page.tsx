"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Clapperboard } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = { id: number; title: string; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; quality: string | null };

export default function VideosPage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const supabase = createClient();
  const [tab, setTab] = useState<"creators" | "community">("creators");
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("videos").select("id,title,thumbnail_url,duration,views,likes,quality").eq("published", true).eq("content_type", "video").order("created_at", { ascending: false }).limit(40).then(({ data }) => {
      if (!mounted) return;
      setVideos((data ?? []).filter(v => Number(v.duration || 0) > 180 && Number(v.duration || 0) <= 1800) as Video[]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [tab, supabase]);

  return <PlatformShell active="videos" eyebrow={ar ? "الأعمال" : "WORKS"} title={ar ? "فيديوهات كاملة، مقدمة كأعمال." : "Long-form videos, presented as works."} description={ar ? "من 3 إلى 30 دقيقة، مع أولوية واضحة لأعمال المبدعين." : "From 3 to 30 minutes, with a clear creator-first presentation."}>
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-7 md:px-8 lg:px-10">
      <div className="mb-8 flex gap-2 rounded-full border p-1 w-fit" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.68)" }}>
        <button onClick={() => setTab("creators")} className="rounded-full px-5 py-2 text-xs font-bold" style={{ background: tab === "creators" ? "#C47A52" : "transparent", color: tab === "creators" ? "#090909" : "inherit" }}>{ar ? "المبدعون" : "Creators"}</button>
        <button onClick={() => setTab("community")} className="rounded-full px-5 py-2 text-xs font-bold" style={{ background: tab === "community" ? "#C47A52" : "transparent", color: tab === "community" ? "#090909" : "inherit" }}>{ar ? "العامة" : "Community"}</button>
      </div>
      {loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i => <div key={i} className="aspect-video animate-pulse rounded-[28px] bg-white/5"/>)}</div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{videos.map(video => <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.74)" }}><div className="relative aspect-video overflow-hidden bg-[#183F46]"><img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"/><div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"/><div className="absolute bottom-3 start-3 flex gap-2"><span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-bold text-white">{video.quality || "4K ready"}</span><span className="rounded-full border border-white/15 bg-black/55 px-2.5 py-1 text-[10px] font-semibold text-white"><Clapperboard size={11} className="me-1 inline"/>{video.duration ? `${Math.floor(video.duration/60)}:${String(Math.round(video.duration)%60).padStart(2,"0")}` : "—"}</span></div></div><div className="p-5"><h2 className="line-clamp-2 text-lg font-bold leading-7">{video.title}</h2><p className="mt-3 text-xs opacity-50">{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"} · {Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</p></div></a>)}</div>}
    </div>
  </PlatformShell>;
}

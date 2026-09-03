"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Play, Volume2, VolumeX } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Video = { id: number; title: string; thumbnail_url: string | null; views: number | null; creator?: { name: string } | null };

export default function ShortsPage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [tab, setTab] = useState<"creators" | "community">("creators");
  const [videos, setVideos] = useState<Video[]>([]);
  const [muted, setMuted] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("videos").select("id,title,thumbnail_url,views").eq("published", true).eq("content_type", "short").order("created_at", { ascending: false }).limit(30).then(({ data }) => {
      if (!mounted) return;
      setVideos((data ?? []) as Video[]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [supabase]);

  return <PlatformShell active="shorts" eyebrow={ar ? "RAVINE Cuts" : "RAVINE Cuts"} title={ar ? "شورتس، لكن بروح سينمائية." : "Short-form with a cinematic point of view."} description={ar ? "حتى 3 دقائق. أولوية للمبدعين، ومساحة مفتوحة للمجتمع." : "Up to 3 minutes. Creator-first, community-open."}>
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-7 md:px-8 lg:px-10">
      <div className="mb-7 flex gap-2 rounded-full border p-1 w-fit" style={{ borderColor: "rgba(241,233,220,.10)", background: "rgba(21,23,25,.68)" }}>
        <button onClick={() => setTab("creators")} className="rounded-full px-5 py-2 text-xs font-bold" style={{ background: tab === "creators" ? "#C47A52" : "transparent", color: tab === "creators" ? "#090909" : "inherit" }}>{ar ? "المبدعون" : "Creators"}</button>
        <button onClick={() => setTab("community")} className="rounded-full px-5 py-2 text-xs font-bold" style={{ background: tab === "community" ? "#C47A52" : "transparent", color: tab === "community" ? "#090909" : "inherit" }}>{ar ? "العامة" : "Community"}</button>
      </div>
      {loading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"><div className="h-[470px] animate-pulse rounded-[30px] bg-white/5"/><div className="h-[470px] animate-pulse rounded-[30px] bg-white/5"/><div className="h-[470px] animate-pulse rounded-[30px] bg-white/5"/></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{videos.map((video) => <a key={video.id} href={`/${locale}/watch/${video.id}`} className="group relative aspect-[9/16] overflow-hidden rounded-[30px] border" style={{ borderColor: "rgba(241,233,220,.09)", background: "#151719" }}><img src={video.thumbnail_url || "/RAVINE.png"} alt={video.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"/><div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent"/><div className="absolute inset-x-4 bottom-4"><div className="mb-3 flex items-center justify-between"><span className="rounded-full border border-white/15 bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white">{tab === "creators" ? "CREATOR" : "COMMUNITY"}</span><button type="button" onClick={(e) => { e.preventDefault(); setMuted(v => !v); }} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white">{muted ? <VolumeX size={15}/> : <Volume2 size={15}/>}</button></div><h2 className="line-clamp-2 text-lg font-bold text-white">{video.title}</h2><p className="mt-2 text-xs text-white/60">{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</p></div><div className="absolute inset-x-0 top-1/2 flex justify-center opacity-0 transition group-hover:opacity-100"><span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-black shadow-2xl"><Play size={18} fill="currentColor"/></span></div></a>)}</div>}
    </div>
  </PlatformShell>;
}

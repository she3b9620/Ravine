"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Headphones } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type Podcast = { id: number; title: string; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; quality: string | null };

export default function PodcastsPage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [podcasts, setPodcasts] = useState<Podcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("videos").select("id,title,thumbnail_url,duration,views,likes,quality").eq("published", true).eq("content_type", "podcast").order("created_at", { ascending: false }).limit(30).then(({ data }) => {
      if (!mounted) return;
      setPodcasts((data ?? []).filter(v => Number(v.duration || 0) > 1800) as Podcast[]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [supabase]);

  return <PlatformShell active="podcasts" eyebrow="RAVINE PODCASTS" title={ar ? "حكايات وحوارات تستحق وقتك." : "Conversations worth staying for."} description={ar ? "بودكاست المبدعين فقط — بصريًا وصوتيًا، بجودة تناسب التجربة." : "Creator podcasts — visual or audio-first, presented with the same cinematic care."}>
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
      <div className="mb-8 rounded-[30px] border p-6" style={{ borderColor: "rgba(24,63,70,.7)", background: "linear-gradient(135deg, rgba(24,63,70,.20), rgba(196,122,82,.08))" }}><div className="flex items-center gap-3" style={{ color: "#C47A52" }}><Headphones size={20}/><span className="text-xs font-bold uppercase tracking-[.22em]">Creator only</span></div><p className="mt-3 max-w-2xl text-sm leading-6 opacity-60">{ar ? "البودكاست هنا جزء من هوية المبدع، وليس مجرد قائمة صوتية منفصلة عن بقية أعماله." : "Podcast is part of creator identity, not an isolated audio feed."}</p></div>
      {loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i => <div key={i} className="aspect-[4/3] animate-pulse rounded-[28px] bg-white/5"/>)}</div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{podcasts.map(p => <a key={p.id} href={`/${locale}/watch/${p.id}`} className="group overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.74)" }}><div className="relative aspect-[4/3] overflow-hidden bg-[#183F46]"><img src={p.thumbnail_url || "/RAVINE.png"} alt={p.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"/><div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent"/><div className="absolute bottom-4 start-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-3 py-1.5 text-[10px] font-bold text-white"><Headphones size={12}/>{p.quality || "Premium"}</div></div><div className="p-5"><h2 className="text-lg font-bold leading-7">{p.title}</h2><p className="mt-2 text-xs opacity-50">{p.duration ? `${Math.floor(p.duration/60)} min` : "—"} · {Number(p.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</p></div></a>)}</div>}
    </div>
  </PlatformShell>;
}

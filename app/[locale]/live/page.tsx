"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Radio, Users, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PlatformShell from "@/components/PlatformShell";

type LiveItem = { id: number; title: string; thumbnail_url: string | null; views: number | null; description: string | null };

export default function LivePage() {
  const locale = useLocale();
  const ar = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [live, setLive] = useState<LiveItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.from("videos").select("id,title,thumbnail_url,views,description").eq("published", true).eq("content_type", "live").order("created_at", { ascending: false }).limit(24).then(({ data }) => {
      if (!mounted) return;
      setLive((data ?? []) as LiveItem[]);
      setLoading(false);
    });
    return () => { mounted = false; };
  }, [supabase]);

  return <PlatformShell active="live" eyebrow="RAVINE LIVE" title={ar ? "بث مباشر، لكن كأنه حدث." : "Live, treated like an event."} description={ar ? "Premiere، كواليس، ورش، Q&A، ألعاب وبثوث المبدعين في تجربة واحدة." : "Premieres, BTS, workshops, Q&As, gaming and creator streams in one experience."}>
    <div className="mx-auto max-w-[1440px] px-5 pb-20 pt-8 md:px-8 lg:px-10">
      <div className="mb-8 grid gap-4 lg:grid-cols-4"><div className="rounded-[28px] border p-5 lg:col-span-2" style={{ borderColor: "rgba(196,122,82,.30)", background: "linear-gradient(135deg, rgba(196,122,82,.10), rgba(24,63,70,.14))" }}><div className="flex items-center gap-3 text-[#C47A52]"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#C47A52] opacity-50"/><span className="relative inline-flex h-3 w-3 rounded-full bg-[#C47A52]"/></span><span className="text-xs font-black tracking-[.18em]">LIVE NOW</span></div><h2 className="mt-4 text-xl font-bold">{ar ? "الفعاليات المباشرة" : "Live events"}</h2><p className="mt-2 text-sm leading-6 opacity-55">{ar ? "البث في RAVINE له هوية: حدث، ورشة، عرض، أو لحظة إبداع حقيقية." : "Every live stream has a purpose: an event, workshop, screening, or real creative moment."}</p></div><div className="rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.62)" }}><Radio size={20} className="opacity-60"/><p className="mt-5 text-sm font-bold">{ar ? "Premiere" : "Premiere"}</p><p className="mt-1 text-xs opacity-45">{ar ? "عرض أول جماعي" : "A shared first screening"}</p></div><div className="rounded-[28px] border p-5" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.62)" }}><Video size={20} className="opacity-60"/><p className="mt-5 text-sm font-bold">{ar ? "Open Studio" : "Open Studio"}</p><p className="mt-1 text-xs opacity-45">{ar ? "شاهد المبدع وهو يعمل" : "Watch creators work"}</p></div></div>
      {loading ? <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{[1,2,3].map(i => <div key={i} className="aspect-video animate-pulse rounded-[28px] bg-white/5"/>)}</div> : live.length === 0 ? <div className="rounded-[28px] border p-12 text-center" style={{ borderColor: "rgba(24,63,70,.65)", background: "rgba(21,23,25,.65)" }}><Radio className="mx-auto opacity-50" size={32}/><h2 className="mt-5 text-xl font-bold">{ar ? "لا توجد بثوث مباشرة الآن" : "Nothing live right now"}</h2><p className="mt-2 text-sm opacity-50">{ar ? "ترقب العروض والورش القادمة من مبدعي RAVINE." : "More screenings, workshops and creator events are coming."}</p></div> : <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{live.map(item => <a key={item.id} href={`/${locale}/watch/${item.id}`} className="group overflow-hidden rounded-[28px] border" style={{ borderColor: "rgba(241,233,220,.09)", background: "rgba(21,23,25,.74)" }}><div className="relative aspect-video overflow-hidden bg-[#183F46]"><img src={item.thumbnail_url || "/RAVINE.png"} alt={item.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.045]"/><div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent"/><span className="absolute top-3 start-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black text-white"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white"/>LIVE</span><span className="absolute bottom-3 end-3 flex items-center gap-1 rounded-full bg-black/60 px-2.5 py-1 text-[10px] text-white"><Users size={11}/>{Number(item.views || 0).toLocaleString()}</span></div><div className="p-5"><h2 className="text-lg font-bold leading-7">{item.title}</h2><p className="mt-2 line-clamp-2 text-xs leading-5 opacity-50">{item.description}</p></div></a>)}</div>}
    </div>
  </PlatformShell>;
}

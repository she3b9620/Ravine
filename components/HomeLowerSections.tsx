"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Film, Layers3, Mic2, Play, Sparkles, Users, Video, Zap } from "lucide-react";
import { useLocale } from "next-intl";
import { createClient } from "@/lib/supabase/client";

type Creator = { id: number; name: string; username: string | null; avatar_url: string | null; bio: string | null; followers: number | null };
type Category = { id: number; name: string; slug: string };
type Work = { id: number; title: string; thumbnail_url: string | null; content_type: string | null; views: number | null };

const icons = [Film, Video, Zap, Mic2];

export default function HomeLowerSections() {
  const locale = useLocale();
  const isArabic = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [creators, setCreators] = useState<Creator[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [works, setWorks] = useState<Work[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from("creators").select("id,name,username,avatar_url,bio,followers").order("followers", { ascending: false }).limit(6),
      supabase.from("categories").select("id,name,slug").order("name", { ascending: true }).limit(8),
      supabase.from("videos").select("id,title,thumbnail_url,content_type,views").eq("published", true).order("created_at", { ascending: false }).limit(6),
    ]).then(([creatorResult, categoryResult, workResult]) => {
      if (!active) return;
      setCreators((creatorResult.data as Creator[] | null) ?? []);
      setCategories((categoryResult.data as Category[] | null) ?? []);
      setWorks((workResult.data as Work[] | null) ?? []);
    });
    return () => { active = false; };
  }, [supabase]);

  function count(value: number | null | undefined) {
    const n = Number(value ?? 0);
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  }

  const features = isArabic
    ? [
        { title: "أعمال أصلية", text: "مساحة تضع جودة العمل البصري قبل ضوضاء الخوارزميات." },
        { title: "هوية للمبدع", text: "ملف احترافي يبرز أعمالك، تخصصك، اعتماداتك وروابطك." },
        { title: "محتوى متعدد", text: "Works وCuts وPodcasts والبث المباشر في منظومة واحدة." },
        { title: "مجتمع إبداعي", text: "تابع المبدعين، شارك، وتعاون بدل الاكتفاء بالمشاهدة." },
      ]
    : [
        { title: "Original work", text: "A home that puts visual craft before algorithmic noise." },
        { title: "Creator identity", text: "A professional profile for your work, specialty, credits and links." },
        { title: "More than video", text: "Works, Cuts, Podcasts and live experiences in one ecosystem." },
        { title: "Creative community", text: "Follow, collaborate and participate—not just watch." },
      ];

  return (
    <div className="mx-auto max-w-[1560px] px-4 pb-24 md:px-7">
      <section className="mt-16 animate-[ravine-reveal_900ms_cubic-bezier(.22,1,.36,1)_both]">
        <div className="mb-7 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>{isArabic ? "لماذا RAVINE" : "WHY RAVINE"}</span><h2 className="mt-2 text-3xl font-black md:text-5xl">{isArabic ? "منصة معمولة علشان العمل، مش الضوضاء." : "Built for the work, not the noise."}</h2></div></div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{features.map((feature, index) => { const Icon = icons[index]; return <article key={feature.title} className="ravine-card rounded-[28px] border p-6" style={{ background: "rgba(19,22,23,.72)", borderColor: "rgba(241,233,220,.10)" }}><div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.12)", color: "#C47A52" }}><Icon size={19} /></div><h3 className="mt-5 text-lg font-black">{feature.title}</h3><p className="mt-2 text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>{feature.text}</p></article>; })}</div>
      </section>

      {creators.length > 0 && <section className="mt-20 animate-[ravine-reveal_900ms_120ms_cubic-bezier(.22,1,.36,1)_both]"><div className="mb-7 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>{isArabic ? "اختيار المبدعين" : "CREATOR SPOTLIGHT"}</span><h2 className="mt-2 text-3xl font-black md:text-5xl">{isArabic ? "أشخاص يستحقون الاكتشاف." : "Creators worth discovering."}</h2></div><a href={`/${locale}/creators`} className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "استكشف المبدعين" : "Explore creators"}<ArrowUpRight size={14} /></a></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{creators.slice(0, 6).map((creator) => <a key={creator.id} href={creator.username ? `/${locale}/creator/${creator.username}` : `/${locale}/creators`} className="ravine-creator-card group rounded-[30px] border p-5" style={{ background: "rgba(19,22,23,.72)", borderColor: "rgba(241,233,220,.10)" }}><div className="flex items-center gap-4"><img src={creator.avatar_url || "/RAVINE.png"} alt="" className="h-16 w-16 rounded-2xl object-cover transition duration-500 group-hover:scale-105" /><div className="min-w-0"><h3 className="truncate text-lg font-black">{creator.name}</h3><p className="mt-1 truncate text-xs" style={{ color: "rgba(241,233,220,.48)" }}>@{creator.username || "creator"}</p></div></div><p className="mt-5 line-clamp-2 text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>{creator.bio || (isArabic ? "مبدع بصري على RAVINE." : "Visual creator on RAVINE.")}</p><div className="mt-5 flex items-center gap-2 text-xs font-bold" style={{ color: "#C47A52" }}><Users size={14} />{count(creator.followers)} {isArabic ? "متابع" : "followers"}</div></a>)}</div></section>}

      {categories.length > 0 && <section className="mt-20 animate-[ravine-reveal_900ms_240ms_cubic-bezier(.22,1,.36,1)_both]"><div className="mb-7"><span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>{isArabic ? "الكون الإبداعي" : "THE CREATIVE WORLD"}</span><h2 className="mt-2 text-3xl font-black md:text-5xl">{isArabic ? "فئات تصنع منها طريقك." : "Find your creative lane."}</h2></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">{categories.map((category) => <a key={category.id} href={`/${locale}/search?category=${encodeURIComponent(category.slug)}`} className="ravine-card rounded-3xl border p-5" style={{ background: "rgba(19,22,23,.72)", borderColor: "rgba(241,233,220,.10)" }}><div className="mb-6 h-1 w-10 rounded-full" style={{ background: "#C47A52" }} /><p className="text-sm font-black">{category.name}</p><p className="mt-2 text-xs" style={{ color: "rgba(241,233,220,.42)" }}>{isArabic ? "استكشف الأعمال" : "Explore work"}</p></a>)}</div></section>}

      {works.length > 0 && <section className="mt-20 animate-[ravine-reveal_900ms_360ms_cubic-bezier(.22,1,.36,1)_both]"><div className="mb-7 flex items-end justify-between gap-4"><div><span className="text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#C47A52" }}>{isArabic ? "نظرة أخيرة" : "A LAST LOOK"}</span><h2 className="mt-2 text-3xl font-black md:text-5xl">{isArabic ? "آخر الأعمال على RAVINE." : "Recent work on RAVINE."}</h2></div><a href={`/${locale}/videos`} className="inline-flex items-center gap-1 text-xs font-bold" style={{ color: "#C47A52" }}>{isArabic ? "كل الأعمال" : "All works"}<ArrowUpRight size={14} /></a></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{works.map((work) => <a key={work.id} href={`/${locale}/watch/${work.id}`} className="ravine-card group overflow-hidden rounded-[28px] border" style={{ background: "rgba(19,22,23,.72)", borderColor: "rgba(241,233,220,.10)" }}><div className="relative aspect-video overflow-hidden" style={{ background: "rgba(241,233,220,.035)" }}>{work.thumbnail_url ? <img src={work.thumbnail_url} alt={work.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /> : <div className="flex h-full items-center justify-center" style={{ color: "rgba(241,233,220,.4)" }}><Play size={22} /></div>}<div className="absolute inset-x-3 bottom-3 flex items-center justify-between"><span className="rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "rgba(0,0,0,.72)", color: "#fff" }}>{work.content_type || "work"}</span><span className="rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "rgba(0,0,0,.72)", color: "#fff" }}>{count(work.views)} {isArabic ? "مشاهدة" : "views"}</span></div></div><div className="p-5"><h3 className="line-clamp-2 text-base font-black leading-7">{work.title}</h3></div></a>)}</div></section>}

      <section className="mt-20 overflow-hidden rounded-[36px] border p-8 text-center md:p-14 animate-[ravine-reveal_900ms_480ms_cubic-bezier(.22,1,.36,1)_both]" style={{ borderColor: "rgba(196,122,82,.18)", background: "radial-gradient(circle at 50% 0%, rgba(200,154,82,.14), transparent 45%), rgba(19,22,23,.78)" }}><div className="mx-auto max-w-3xl"><div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "rgba(196,122,82,.12)", color: "#C47A52" }}><Sparkles size={21} /></div><h2 className="mt-5 text-3xl font-black md:text-5xl">{isArabic ? "المكان اللي يستحق شغلك." : "A home worthy of your work."}</h2><p className="mt-4 text-sm leading-7" style={{ color: "rgba(241,233,220,.58)" }}>{isArabic ? "اكتشف المنصة، ابنِ هويتك، وخلّي أفضل أعمالك تتكلم عنك." : "Discover the platform, build your identity, and let your best work speak for itself."}</p><a href={`/${locale}/creator`} className="mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-black" style={{ background: "#C47A52", color: "#090909" }}>{isArabic ? "ابدأ كصانع" : "Become a creator"}<ArrowUpRight size={15} /></a></div></section>
    </div>
  );
}

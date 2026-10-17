import Link from "next/link";
import { Scissors, Clapperboard, Film, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

export type RAVINEMediaCatalogType = "short" | "short_film" | "film";

const configs: Record<RAVINEMediaCatalogType, {
  enTitle: string; arTitle: string; enEyebrow: string; arEyebrow: string;
  enDescription: string; arDescription: string; enLabel: string; arLabel: string;
  enEmpty: string; arEmpty: string; icon: LucideIcon; className: string;
}> = {
  short: {
    enTitle: "Shorts.", arTitle: "الشورتات.", enEyebrow: "RAVINE / SHORTS", arEyebrow: "رَافِين / الشورتات",
    enDescription: "Short, focused clips with their own discovery experience—separate from regular videos and short films.",
    arDescription: "مقاطع قصيرة ومكثفة، لها تجربة اكتشاف مستقلة عن الفيديوهات والأفلام القصيرة.",
    enLabel: "SHORT", arLabel: "شورت", enEmpty: "No published Shorts yet.", arEmpty: "لا توجد شورتات منشورة بعد.",
    icon: Scissors, className: "ravine-shorts-page",
  },
  short_film: {
    enTitle: "Short Films.", arTitle: "الأفلام القصيرة.", enEyebrow: "RAVINE / SHORT FILMS", arEyebrow: "رَافِين / سينما قصيرة",
    enDescription: "Complete, compact cinematic works—not vertical Shorts or regular video posts.",
    arDescription: "أفلام سردية مكتملة ومكثفة؛ ليست شورتات عمودية ولا مقاطع فيديو عادية.",
    enLabel: "SHORT FILM", arLabel: "فيلم قصير", enEmpty: "No published short films yet.", arEmpty: "لا توجد أفلام قصيرة منشورة بعد.",
    icon: Film, className: "ravine-short-films-page",
  },
  film: {
    enTitle: "Feature Films.", arTitle: "الأفلام المطوّلة.", enEyebrow: "RAVINE / FEATURE FILMS", arEyebrow: "رَافِين / سينما طويلة",
    enDescription: "Completed feature-length cinema, kept separate from short films and documentaries.",
    arDescription: "أفلام سينمائية طويلة مكتملة، بتصنيف مستقل عن الأفلام القصيرة والوثائقيات.",
    enLabel: "FEATURE FILM", arLabel: "فيلم مطوّل", enEmpty: "No published feature films yet.", arEmpty: "لا توجد أفلام مطوّلة منشورة بعد.",
    icon: Clapperboard, className: "ravine-feature-films-page",
  },
};

type Work = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; quality: string | null };

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds), hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default async function RAVINEMediaCatalog({ locale, contentType }: { locale: "ar" | "en"; contentType: RAVINEMediaCatalogType }) {
  const ar = locale === "ar";
  const config = configs[contentType];
  const Icon = config.icon;
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,quality")
    .eq("published", true).eq("visibility", "public").eq("content_type", contentType)
    .order("created_at", { ascending: false }).limit(60);
  const works = (data ?? []) as Work[];

  return <section className={`section ravine-documentaries-page ${config.className}`} dir={ar ? "rtl" : "ltr"}>
    <div className="ravine-documentaries-hero"><div className="ravine-documentaries-mark" aria-hidden="true"><Icon size={28} strokeWidth={1.6} /></div>
      <div><div className="eyebrow">{ar ? config.arEyebrow : config.enEyebrow}</div><h1>{ar ? config.arTitle : config.enTitle}</h1>
        <p className="section-note">{ar ? config.arDescription : config.enDescription}</p>
        {!error && works.length > 0 ? <div className="ravine-series-count">{formatRavineNumber(works.length, locale)} {ar ? "عمل منشور" : "published works"}</div> : null}
      </div>
    </div>
    {error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل المحتوى." : "We could not load this content."}</strong><span>{error.message}</span></div>
      : works.length === 0 ? <div className="empty-state"><strong>{ar ? config.arEmpty : config.enEmpty}</strong><span>{ar ? "ستظهر الأعمال هنا بعد اعتماد نشرها من مساحة المبدع." : "Published work will appear here after creator publication."}</span></div>
      : <div className={`video-grid ravine-documentaries-grid ${contentType === "short" ? "ravine-shorts-grid" : ""}`}>{works.map(work => (
        <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
          <div className="video-thumb"><img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" /><span className="duration">{durationLabel(work.duration)}</span><span className="documentary-pill">{ar ? config.arLabel : config.enLabel}</span></div>
          <div className="video-meta"><div className="video-kicker">{config.enLabel}{work.quality ? ` · ${work.quality}` : ""}</div><h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2>
            <p>{work.description || (ar ? "عمل من مجتمع رَافِين." : "A work from the RAVINE community.")}</p>
            <div className="video-stats"><span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span><span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span></div>
          </div>
        </Link>
      ))}</div>}
  </section>;
}

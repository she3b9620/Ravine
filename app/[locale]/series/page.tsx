import { Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import RAVINEWorkCatalog, { type RAVINECatalogItem } from "@/components/RAVINEWorkCatalog";
import styles from "./series.module.css";

export const dynamic = "force-dynamic";
type Locale = "ar" | "en";
type SeriesTitle = { id: number; title: string; description: string | null; poster_url: string | null; created_at: string | null; published: boolean; visibility: string };
type SeriesEpisode = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; quality: string | null; series_id: number | null; season_number: number | null; episode_number: number | null; created_at: string | null };

export default async function SeriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar", ar = locale === "ar";
  const supabase = await createClient();
  const [seriesResult, episodesResult] = await Promise.all([
    supabase.from("ravine_series_titles").select("id,title,description,poster_url,created_at,published,visibility").eq("published", true).eq("visibility", "public").order("created_at", { ascending: false }).limit(100),
    supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality,series_id,season_number,episode_number,created_at").eq("published", true).eq("visibility", "public").eq("content_type", "series").order("created_at", { ascending: false }).limit(500),
  ]);
  let pageError = false;
  let seriesTitles = (seriesResult.data ?? []) as SeriesTitle[];
  let episodes = (episodesResult.data ?? []) as SeriesEpisode[];
  const structuredDataUnavailable = Boolean(seriesResult.error || episodesResult.error);
  if (structuredDataUnavailable) {
    const legacyResult = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality,created_at")
      .eq("published", true).eq("visibility", "public").eq("content_type", "series").order("created_at", { ascending: false }).limit(100);
    if (legacyResult.error) pageError = true;
    else {
      episodes = (legacyResult.data ?? []).map(row => ({ ...row, series_id: null, season_number: null, episode_number: null })) as SeriesEpisode[];
      seriesTitles = [];
    }
  }
  const titleCards = seriesTitles.map(series => {
    const attachedEpisodes = episodes.filter(episode => episode.series_id === series.id);
    const seasonCount = new Set(attachedEpisodes.map(episode => episode.season_number || 1)).size;
    const image = series.poster_url || attachedEpisodes.find(episode => episode.thumbnail_url)?.thumbnail_url || "/RAVINE.PNG";
    return { series, attachedEpisodes, seasonCount, image };
  }).filter(item => item.attachedEpisodes.length > 0);
  const legacyEpisodes = episodes.filter(episode => !episode.series_id);

  const seriesItems: RAVINECatalogItem[] = titleCards.map(({series,attachedEpisodes,seasonCount,image}) => ({
    id:series.id,href:`/${locale}/series/${series.id}`,title:series.title,
    description:series.description||(ar?"عمل متسلسل من مجتمع رَافِين.":"A serialized work from RAVINE creators."),
    imageUrl:image,duration:null,views:null,likes:null,quality:null,createdAt:series.created_at,
    badge:ar?"مسلسل":"Series",kicker:"SERIES",badgeIcon:"series",badgeTone:"series",badgeClassName:styles.seriesPill,cardClassName:"ravine-series-card",
    primaryMetric:`${formatRavineNumber(attachedEpisodes.length,locale)} ${ar?"حلقة":"episodes"}`,
    secondaryMetric:`${formatRavineNumber(seasonCount,locale)} ${ar?"موسم":"seasons"}`,
  }));
  const legacyItems: RAVINECatalogItem[] = legacyEpisodes.map(work => ({
    id:work.id,href:`/${locale}/watch/${work.id}`,title:work.title||(ar?"حلقة بدون عنوان":"Untitled episode"),
    description:work.description||(ar?"هذه الحلقة لم تُربط بعد بمسلسل وموسم.":"This episode has not been linked to a series and season yet."),
    imageUrl:work.thumbnail_url,duration:work.duration,views:work.views,likes:work.likes,quality:work.quality,createdAt:work.created_at,
    badge:ar?"حلقة غير مرتبة":"Unsorted episode",kicker:"SERIES EPISODE",badgeIcon:"episode",badgeTone:"series",badgeClassName:styles.seriesPill,cardClassName:"ravine-series-card",
  }));

  return <section className="section ravine-documentaries-page ravine-series-page" dir={ar ? "rtl" : "ltr"}>
    <div className="ravine-documentaries-hero"><div className="ravine-documentaries-mark" aria-hidden="true"><Tv size={28} strokeWidth={1.6} /></div>
      <div><div className="eyebrow">{ar ? "رَافِين / الدراما" : "RAVINE / SERIES"}</div><h1>{ar ? "المسلسلات." : "Series."}</h1>
        <p className="section-note">{ar ? "كل مسلسل عمل مستقل، بداخله مواسم وحلقات مرتبة؛ منفصل عن الفيديوهات والأفلام." : "Each series is a distinct work with seasons and ordered episodes—not a regular video or film."}</p>
        {!pageError && titleCards.length > 0 ? <div className="ravine-series-count">{formatRavineNumber(titleCards.length, locale)} {ar ? "مسلسل منشور" : "published series"}</div> : null}
      </div>
    </div>
    {pageError ? <div className="empty-state"><strong>{ar ? "تعذر تحميل المسلسلات." : "We could not load series."}</strong><span>{ar ? "تعذّر استرجاع قائمة المسلسلات الآن. جرّب تحديث الصفحة بعد قليل." : "The series catalogue could not be retrieved right now. Please refresh the page shortly."}</span></div>
      : titleCards.length === 0 && legacyEpisodes.length === 0 ? <div className="empty-state"><strong>{ar ? "لا توجد مسلسلات منشورة بعد." : "No series published yet."}</strong><span>{structuredDataUnavailable ? (ar ? "المواسم والحلقات المنظمة تحتاج إلى تطبيق ترحيل قاعدة البيانات قبل إتاحتها." : "The database migration for structured seasons and episodes must be applied before series publishing is fully enabled.") : (ar ? "ستظهر المسلسلات هنا بعد نشر أول حلقة معتمدة." : "Series appear here after their first approved episode is published.")}</span></div>
      : <>
        {titleCards.length > 0 ? <RAVINEWorkCatalog locale={locale} items={seriesItems} /> : null}
        {legacyEpisodes.length > 0 ? <div className="ravine-series-legacy"><div className="eyebrow">{ar ? "أعمال حلقية تحتاج ترتيب المواسم" : "UNSTRUCTURED SERIES WORK"}</div><RAVINEWorkCatalog locale={locale} items={legacyItems} /></div> : null}
      </>}
  </section>;
}

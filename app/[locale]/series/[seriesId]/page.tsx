import Link from "next/link";
import { notFound } from "next/navigation";
import { Tv, Play } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "../series.module.css";

export const dynamic = "force-dynamic";
type Locale = "ar" | "en";
type SeriesTitle = { id: number; title: string; description: string | null; poster_url: string | null; published: boolean; visibility: string };
type Episode = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; quality: string | null; season_number: number | null; episode_number: number | null };

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds), hours = Math.floor(total / 3600), minutes = Math.floor((total % 3600) / 60), remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default async function SeriesDetailPage({ params }: { params: Promise<{ locale: string; seriesId: string }> }) {
  const { locale: rawLocale, seriesId: rawSeriesId } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar", ar = locale === "ar";
  const seriesId = Number(rawSeriesId);
  if (!Number.isInteger(seriesId) || seriesId < 1) notFound();

  const supabase = await createClient();
  const [{ data: series, error: seriesError }, { data: episodeRows, error: episodesError }] = await Promise.all([
    supabase.from("ravine_series_titles").select("id,title,description,poster_url,published,visibility").eq("id", seriesId).eq("published", true).eq("visibility", "public").maybeSingle(),
    supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality,season_number,episode_number,created_at").eq("series_id", seriesId).eq("content_type", "series").eq("published", true).eq("visibility", "public").order("season_number", { ascending: true }).order("episode_number", { ascending: true }),
  ]);
  if (seriesError || episodesError || !series) notFound();
  const title = series as SeriesTitle;
  const episodes = (episodeRows ?? []) as Episode[];
  if (!episodes.length) notFound();
  const seasonNumbers = [...new Set(episodes.map(episode => episode.season_number || 1))].sort((a, b) => a - b);
  const heroImage = title.poster_url || episodes.find(episode => episode.thumbnail_url)?.thumbnail_url || "/RAVINE.PNG";

  return <section className="section ravine-documentaries-page ravine-series-detail-page" dir={ar ? "rtl" : "ltr"}>
    <Link className="button secondary" href={`/${locale}/series`}>{ar ? "العودة إلى المسلسلات" : "Back to Series"}</Link>
    <div className="ravine-documentaries-hero"><div className="ravine-documentaries-mark" aria-hidden="true"><Tv size={28} strokeWidth={1.6} /></div>
      <div><div className="eyebrow">{ar ? "رَافِين / مسلسل" : "RAVINE / SERIES"}</div><h1>{title.title}.</h1><p className="section-note">{title.description || (ar ? "مسلسل من مجتمع رَافِين." : "A series from RAVINE creators.")}</p>
        <div className="ravine-series-count">{formatRavineNumber(episodes.length, locale)} {ar ? "حلقة منشورة" : "published episodes"}</div>
      </div>
    </div>
    <div className="ravine-series-detail-poster"><img src={heroImage} alt="" /></div>
    {seasonNumbers.map(season => {
      const seasonEpisodes = episodes.filter(episode => (episode.season_number || 1) === season);
      return <section className="ravine-series-season" key={season}>
        <div className="section-head"><div><div className="eyebrow">{ar ? "الموسم" : "SEASON"} {formatRavineNumber(season, locale)}</div><h2>{ar ? `الموسم ${formatRavineNumber(season, locale)}` : `Season ${season}`}</h2><p className="section-note">{formatRavineNumber(seasonEpisodes.length, locale)} {ar ? "حلقة" : "episodes"}</p></div></div>
        <div className="video-grid ravine-documentaries-grid">{seasonEpisodes.map((episode, index) => (
          <Link href={`/${locale}/watch/${episode.id}`} className="video-card ravine-series-card" key={episode.id}>
            <div className="video-thumb"><img src={episode.thumbnail_url || heroImage} alt="" loading="lazy" /><span className="duration">{durationLabel(episode.duration)}</span><span className={`documentary-pill ${styles.seriesPill}`}><Play size={12} aria-hidden="true" />{ar ? `الحلقة ${formatRavineNumber(episode.episode_number || index + 1, locale)}` : `Episode ${episode.episode_number || index + 1}`}</span></div>
            <div className="video-meta"><div className="video-kicker">S${String(season).padStart(2, "0")} · E${String(episode.episode_number || index + 1).padStart(2, "0")}${episode.quality ? ` · ${episode.quality}` : ""}</div>
              <h2>{episode.title || (ar ? "حلقة بدون عنوان" : "Untitled episode")}</h2><p>{episode.description || (ar ? "حلقة من المسلسل." : "An episode from the series.")}</p>
              <div className="video-stats"><span>{formatRavineNumber(Number(episode.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span><span>{formatRavineNumber(Number(episode.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span></div></div>
          </Link>
        ))}</div>
      </section>;
    })}
  </section>;
}

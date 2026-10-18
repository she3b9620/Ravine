import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clapperboard, Play, Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "../series.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SeriesTitle = {
  id: number;
  title: string;
  description: string | null;
  poster_url: string | null;
  published: boolean;
  visibility: string;
};
type SeriesEpisode = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  season_number: number | null;
  episode_number: number | null;
  created_at: string | null;
};
type NumberedEpisode = {
  work: SeriesEpisode;
  seasonNumber: number;
  episodeNumber: number;
};
type SeasonGroup = {
  number: number;
  episodes: NumberedEpisode[];
};

function positiveNumber(value: number | null, fallback: number) {
  return Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : fallback;
}

function groupEpisodes(episodes: SeriesEpisode[]): SeasonGroup[] {
  const grouped = new Map<number, NumberedEpisode[]>();

  for (const episode of episodes) {
    const seasonNumber = positiveNumber(episode.season_number, 1);
    const seasonEpisodes = grouped.get(seasonNumber) ?? [];
    seasonEpisodes.push({
      work: episode,
      seasonNumber,
      episodeNumber: positiveNumber(episode.episode_number, seasonEpisodes.length + 1),
    });
    grouped.set(seasonNumber, seasonEpisodes);
  }

  return Array.from(grouped.entries())
    .sort(([left], [right]) => left - right)
    .map(([number, seasonEpisodes]) => ({
      number,
      episodes: seasonEpisodes.sort((left, right) =>
        left.episodeNumber - right.episodeNumber
        || (Date.parse(left.work.created_at || "") || 0) - (Date.parse(right.work.created_at || "") || 0),
      ),
    }));
}

function durationLabel(seconds: number | null, locale: Locale) {
  if (!seconds || seconds < 1) return locale === "ar" ? "المدة غير محددة" : "Duration not specified";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default async function SeriesDetailPage({
  params,
}: {
  params: Promise<{ locale: string; seriesId: string }>;
}) {
  const { locale: rawLocale, seriesId: rawSeriesId } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const seriesId = Number(rawSeriesId);

  if (!Number.isSafeInteger(seriesId) || seriesId < 1) notFound();

  const supabase = await createClient();
  const { data: seriesData, error: seriesError } = await supabase
    .from("ravine_series_titles")
    .select("id,title,description,poster_url,published,visibility")
    .eq("id", seriesId)
    .eq("published", true)
    .eq("visibility", "public")
    .maybeSingle();

  // Never expose unpublished, private, or unknown series through this public URL.
  if (seriesError || !seriesData) notFound();
  const series = seriesData as SeriesTitle;

  const { data: episodeData, error: episodeError } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,quality,season_number,episode_number,created_at")
    .eq("series_id", series.id)
    .eq("content_type", "series")
    .eq("published", true)
    .eq("visibility", "public")
    .order("season_number", { ascending: true })
    .order("episode_number", { ascending: true })
    .limit(500);

  const episodes = (episodeData ?? []) as SeriesEpisode[];
  const seasons = groupEpisodes(episodes);
  const episodeCount = seasons.reduce((total, season) => total + season.episodes.length, 0);
  const posterUrl = series.poster_url || episodes.find((episode) => episode.thumbnail_url)?.thumbnail_url || "/RAVINE.PNG";

  return (
    <section className={`section ravine-series-page ${styles.detailPage}`} dir={ar ? "rtl" : "ltr"}>
      <Link className={styles.detailBackLink} href={`/${locale}/series`}>
        {ar ? <ArrowRight size={16} aria-hidden="true" /> : <ArrowLeft size={16} aria-hidden="true" />}
        <span>{ar ? "العودة إلى المسلسلات" : "Back to series"}</span>
      </Link>

      <header className={styles.detailHero}>
        <div className={styles.detailPoster}>
          <img src={posterUrl} alt={series.title} loading="eager" fetchPriority="high" />
        </div>
        <div className={styles.detailHeroCopy}>
          <div className={styles.detailKicker}><Tv size={14} aria-hidden="true" /> RAVINE / SERIES</div>
          <h1>{series.title}</h1>
          <p className={styles.detailDescription}>
            {series.description || (ar ? "مسلسل من أعمال مبدعي رَافِين، مرتب حسب المواسم والحلقات." : "A RAVINE creator series, organised by season and episode.")}
          </p>
          <div className={styles.detailStats} aria-label={ar ? "ملخص المسلسل" : "Series summary"}>
            <span className={styles.detailStat}><Tv size={15} aria-hidden="true" /> {formatRavineNumber(seasons.length, locale)} {ar ? "موسم" : "seasons"}</span>
            <span className={styles.detailStat}><Clapperboard size={15} aria-hidden="true" /> {formatRavineNumber(episodeCount, locale)} {ar ? "حلقة منشورة" : "published episodes"}</span>
          </div>
        </div>
      </header>

      {episodeError ? (
        <div className={styles.detailEmptyState} role="status">
          <strong>{ar ? "تعذّر تحميل الحلقات." : "Episodes could not be loaded."}</strong>
          {ar ? "بيانات المسلسل متاحة، لكن تعذّر جلب قائمة الحلقات. حاول تحديث الصفحة بعد قليل." : "The series is available, but its episode list could not be retrieved. Please refresh the page shortly."}
        </div>
      ) : seasons.length === 0 ? (
        <div className={styles.detailEmptyState}>
          <strong>{ar ? "لا توجد حلقات متاحة حاليًا." : "No episodes are available yet."}</strong>
          {ar ? "ستظهر الحلقات هنا بعد نشرها وإتاحتها للجمهور." : "Episodes will appear here after they are published and made public."}
        </div>
      ) : seasons.map((season) => (
        <section className={styles.seasonSection} key={season.number} aria-labelledby={`ravine-season-${season.number}`}>
          <header className={styles.seasonHeader}>
            <div>
              <p className={styles.seasonEyebrow}>RAVINE / SEASON {formatRavineNumber(season.number, "en")}</p>
              <h2 id={`ravine-season-${season.number}`}>
                {ar ? `الموسم ${formatRavineNumber(season.number, locale)}` : `Season ${formatRavineNumber(season.number, locale)}`}
              </h2>
            </div>
            <span className={styles.seasonCount}>
              {formatRavineNumber(season.episodes.length, locale)} {ar ? "حلقة" : season.episodes.length === 1 ? "episode" : "episodes"}
            </span>
          </header>

          <div className={styles.episodeGrid}>
            {season.episodes.map(({ work, episodeNumber }) => (
              <Link className={styles.episodeCard} href={`/${locale}/watch/${work.id}`} key={work.id}>
                <div className={styles.episodeArtwork}>
                  <img src={work.thumbnail_url || posterUrl} alt="" loading="lazy" decoding="async" />
                  <span className={styles.episodePlay} aria-hidden="true"><Play size={17} fill="currentColor" /></span>
                </div>
                <div className={styles.episodeBody}>
                  <span className={styles.episodeKicker}>
                    {ar ? `الحلقة ${formatRavineNumber(episodeNumber, locale)}` : `EPISODE ${formatRavineNumber(episodeNumber, locale)}`}
                    {work.quality ? ` · ${work.quality}` : ""}
                  </span>
                  <h3 className={styles.episodeTitle}>{work.title || (ar ? "حلقة بدون عنوان" : "Untitled episode")}</h3>
                  {work.description ? <p className={styles.episodeDescription}>{work.description}</p> : null}
                  <div className={styles.episodeFooter}>
                    <span>{durationLabel(work.duration, locale)}</span>
                    <span>{ar ? "مشاهدة الحلقة" : "Watch episode"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </section>
  );
}

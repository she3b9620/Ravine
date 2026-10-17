import Link from "next/link";
import { Tv } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "./series.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type SeriesWork = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
};

function formatDuration(seconds: number | null, fallback: string) {
  if (!seconds || seconds < 1) return fallback;
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default async function SeriesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,quality,created_at")
    .eq("published", true)
    .eq("content_type", "series")
    .order("created_at", { ascending: false })
    .limit(60);

  const seriesWorks = (data ?? []) as SeriesWork[];

  return (
    <section className="section ravine-documentaries-page ravine-series-page" dir={ar ? "rtl" : "ltr"}>
      <div className="ravine-documentaries-hero">
        <div className="ravine-documentaries-mark" aria-hidden="true">
          <Tv size={28} strokeWidth={1.6} />
        </div>
        <div>
          <div className="eyebrow">{ar ? "رَافِين / الدراما" : "RAVINE / SERIES"}</div>
          <h1>{ar ? "المسلسلات." : "Series."}</h1>
          <p className="section-note">
            {ar
              ? "حكايات تمتد عبر الحلقات، وتبني عوالمها وشخصياتها مع الوقت."
              : "Stories that unfold across episodes, building their worlds and characters over time."}
          </p>
          {!error && seriesWorks.length > 0 ? (
            <div className="ravine-series-count">
              {formatRavineNumber(seriesWorks.length, locale)} {ar ? "عملًا منشورًا" : "published series works"}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل المسلسلات." : "We could not load series."}</strong>
          <span>{error.message}</span>
        </div>
      ) : seriesWorks.length === 0 ? (
        <div className="empty-state">
          <strong>{ar ? "لا توجد مسلسلات منشورة بعد." : "No series published yet."}</strong>
          <span>{ar ? "ستظهر الأعمال الحلقية هنا بعد اعتماد نشرها من مساحة المبدع." : "Published episodic works will appear here after their creator publishes them from Studio."}</span>
        </div>
      ) : (
        <div className="video-grid ravine-documentaries-grid ravine-series-grid">
          {seriesWorks.map((work) => (
            <Link href={`/${locale}/watch/${work.id}`} className="video-card ravine-series-card" key={work.id}>
              <div className="video-thumb">
                <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                <span className="duration">{formatDuration(work.duration, "—")}</span>
                <span className={`documentary-pill ${styles.seriesPill}`}>
                  <Tv size={12} strokeWidth={1.8} aria-hidden="true" />
                  {ar ? "مسلسل" : "Series"}
                </span>
              </div>
              <div className="video-meta">
                <div className="video-kicker">SERIES{work.quality ? ` · ${work.quality}` : ""}</div>
                <h2>{work.title || (ar ? "مسلسل بدون عنوان" : "Untitled series")}</h2>
                <p>{work.description || (ar ? "عمل درامي من مجتمع رَافِين." : "A serialized work from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
                  <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

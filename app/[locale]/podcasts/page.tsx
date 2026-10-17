import Link from "next/link";
import { Mic2 } from "lucide-react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import styles from "./podcasts.module.css";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Podcast = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  content_type: string | null;
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

function PodcastCard({ locale, work }: { locale: Locale; work: Podcast }) {
  const ar = locale === "ar";
  return (
    <Link href={`/${locale}/watch/${work.id}`} className="video-card ravine-podcast-card" key={work.id}>
      <div className="video-thumb">
        <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
        <span className="duration">{formatDuration(work.duration, "—")}</span>
        <span className={`documentary-pill ${styles.podcastPill}`}>
          <Mic2 size={12} strokeWidth={1.8} aria-hidden="true" />
          {ar ? "بودكاست" : "Podcast"}
        </span>
      </div>
      <div className="video-meta">
        <div className="video-kicker">PODCAST{work.quality ? ` · ${work.quality}` : ""}</div>
        <h2>{work.title || (ar ? "بودكاست بدون عنوان" : "Untitled podcast")}</h2>
        <p>{work.description || (ar ? "برنامج صوتي من مجتمع رَافِين." : "An audio program from the RAVINE community.")}</p>
        <div className="video-stats">
          <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
          <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function PodcastsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect(`/${locale}`);

  const { data, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,quality,content_type,created_at")
    .eq("published", true)
    .eq("content_type", "podcast")
    .order("created_at", { ascending: false })
    .limit(60);

  const podcasts = (data ?? []) as Podcast[];

  return (
    <section className="section ravine-documentaries-page ravine-podcasts-page" dir={ar ? "rtl" : "ltr"}>
      <div className="ravine-documentaries-hero">
        <div className="ravine-documentaries-mark" aria-hidden="true">
          <Mic2 size={28} strokeWidth={1.6} />
        </div>
        <div>
          <div className="eyebrow">{ar ? "رَافِين / الصوت" : "RAVINE / AUDIO"}</div>
          <h1>{ar ? "البودكاست." : "Podcasts."}</h1>
          <p className="section-note">
            {ar
              ? "حوارات وأفكار وبرامج صوتية تمنح الفكرة وقتها ومساحتها."
              : "Conversations, ideas, and audio programs given the time and space to breathe."}
          </p>
          {!error && podcasts.length > 0 ? (
            <div className="ravine-podcasts-count">
              {formatRavineNumber(podcasts.length, locale)} {ar ? "حلقة منشورة" : "published episodes"}
            </div>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل البودكاست." : "We could not load podcasts."}</strong>
          <span>{error.message}</span>
        </div>
      ) : podcasts.length === 0 ? (
        <div className="empty-state">
          <strong>{ar ? "لا توجد حلقات بودكاست منشورة بعد." : "No podcast episodes published yet."}</strong>
          <span>{ar ? "ستظهر الحلقات هنا عند نشرها." : "Published episodes will appear here."}</span>
        </div>
      ) : (
        <div className="video-grid ravine-documentaries-grid ravine-podcasts-grid">
          {podcasts.map((work) => <PodcastCard key={work.id} locale={locale} work={work} />)}
        </div>
      )}
    </section>
  );
}

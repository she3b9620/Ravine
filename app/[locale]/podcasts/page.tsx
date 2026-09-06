import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./podcasts.module.css";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

export const dynamic = "force-dynamic";

type Work = {
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
  if (!seconds) return fallback;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function WorkCard({ locale, work }: { locale: "ar" | "en"; work: Work }) {
  const ar = locale === "ar";
  return (
    <Link href={`/${locale}/watch/${work.id}`} className={styles.card}>
      <div className={styles.thumb}>
        <img src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
        <span className={styles.duration}>{formatDuration(work.duration, "—")}</span>
        <span className={styles.typePill}><Mic2 size={11} aria-hidden="true" />{ar ? "بودكاست" : "Podcast"}</span>
      </div>
      <div className={styles.meta}>
        <div className={styles.kicker}>PODCAST{work.quality ? ` · ${work.quality}` : ""}</div>
        <h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2>
        <p>{work.description || (ar ? "برنامج صوتي من مجتمع رَافِين." : "A podcast work from the RAVINE community.")}</p>
        <div className={styles.stats}>
          <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
          <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function PodcastsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
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

  const podcasts = (data ?? []) as Work[];

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.identityMark} aria-hidden="true"><span className={styles.identityIconPrimary}><Mic2 size={23} strokeWidth={1.7} /></span></div>
        <div>
          <div className={styles.eyebrow}>RAVINE / AUDIO</div>
          <h1>{ar ? "البودكاست." : "Podcasts."}</h1>
          <p>{ar ? "حوارات وأفكار وبرامج صوتية تمنح الفكرة وقتها ومساحتها." : "Conversations, ideas, and audio programs given the time and space to breathe."}</p>
        </div>
      </div>

      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل البودكاست." : "We could not load podcasts."}</strong><span>{error.message}</span></div>
      ) : !podcasts.length ? (
        <div className="empty-state"><strong>{ar ? "لا توجد حلقات بودكاست منشورة بعد." : "No podcast episodes published yet."}</strong><span>{ar ? "ستظهر الحلقات هنا عند نشرها." : "Published episodes will appear here."}</span></div>
      ) : (
        <section className={styles.group}>
          <div className={styles.sectionHead}>
            <div><div className={styles.sectionKicker}>{ar ? "صوت" : "LISTEN"}</div><h2>{ar ? "الحلقات" : "Episodes"}</h2></div>
            <span>{formatRavineNumber(podcasts.length, locale)} {ar ? "حلقة" : "episodes"}</span>
          </div>
          <div className="video-grid">{podcasts.map((work) => <WorkCard key={work.id} locale={locale} work={work} />)}</div>
        </section>
      )}
    </section>
  );
}

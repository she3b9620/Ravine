import Link from "next/link";
import { redirect } from "next/navigation";
import { Mic2, Film } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import styles from "./podcasts.module.css";

export const dynamic = "force-dynamic";

type ContentType = "podcast" | "documentary";
type Work = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  content_type: ContentType;
};

function formatDuration(seconds: number | null, fallback: string) {
  if (!seconds) return fallback;
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function WorkCard({ locale, work }: { locale: "ar" | "en"; work: Work }) {
  const ar = locale === "ar";
  const documentary = work.content_type === "documentary";
  return (
    <Link href={`/${locale}/watch/${work.id}`} className={styles.card}>
      <div className={styles.thumb}>
        <img src={work.thumbnail_url || "/RAVINE.png"} alt="" />
        <span className={styles.duration}>{formatDuration(work.duration, "—")}</span>
        <span className={`${styles.typePill} ${documentary ? styles.typePillDocumentary : ""}`}>
          {documentary ? <Film size={11} aria-hidden="true" /> : <Mic2 size={11} aria-hidden="true" />}
          {documentary ? (ar ? "وثائقي" : "Documentary") : (ar ? "بودكاست" : "Podcast")}
        </span>
      </div>
      <div className={styles.meta}>
        <div className={styles.kicker}>{documentary ? "DOCUMENTARY" : "PODCAST"}{work.quality ? ` · ${work.quality}` : ""}</div>
        <h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2>
        <p>{work.description || (ar ? "" : "")}</p>
        <div className={styles.stats}>
          <span>{Number(work.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span>
          <span>{Number(work.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span>
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
    .in("content_type", ["podcast", "documentary"])
    .order("created_at", { ascending: false })
    .limit(60);

  const works = ((data ?? []) as Work[]).filter((work) => work.content_type === "podcast" || work.content_type === "documentary");
  const podcasts = works.filter((work) => work.content_type === "podcast");
  const documentaries = works.filter((work) => work.content_type === "documentary");

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.identityMark} aria-hidden="true">
          <span className={styles.identityIconPrimary}><Mic2 size={23} strokeWidth={1.7} /></span>
          <span className={styles.identityIconSecondary}><Film size={16} strokeWidth={1.8} /></span>
        </div>
        <div>
          <div className={styles.eyebrow}>RAVINE / AUDIO + DOCUMENTARY</div>
          <h1>{ar ? "البودكاست والوثائقي." : "Podcasts & Documentaries."}</h1>
          <p>{ar ? "حوارات تُسمع. وقصص تُشاهد. مساحة واحدة للمحتوى الذي يبني الفكرة ويمنحها سياقًا." : "Conversations to hear. Stories to watch. One space for work that gives ideas a voice and a context."}</p>
        </div>
      </div>

      {error ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل المحتوى." : "We could not load this content."}</strong><span>{error.message}</span></div>
      ) : !works.length ? (
        <div className="empty-state"><strong>{ar ? "لا يوجد بودكاست أو وثائقيات منشورة بعد." : "No published podcasts or documentaries yet."}</strong></div>
      ) : (
        <div className={styles.sections}>
          <section className={styles.group}>
            <div className={styles.sectionHead}>
              <div><div className={styles.sectionKicker}>{ar ? "صوت" : "LISTEN"}</div><h2>{ar ? "البودكاست" : "Podcasts"}</h2></div>
              <span>{podcasts.length.toLocaleString()} {ar ? "حلقة" : "episodes"}</span>
            </div>
            {podcasts.length ? <div className="video-grid">{podcasts.map((work) => <WorkCard key={`podcast-${work.id}`} locale={locale} work={work} />)}</div> : <div className="empty-state"><strong>{ar ? "لا توجد حلقات بودكاست منشورة بعد." : "No podcast episodes published yet."}</strong></div>}
          </section>

          <section className={styles.group}>
            <div className={styles.sectionHead}>
              <div><div className={styles.sectionKicker}>{ar ? "صورة" : "WATCH"}</div><h2>{ar ? "الوثائقيات" : "Documentaries"}</h2></div>
              <span>{documentaries.length.toLocaleString()} {ar ? "عمل" : "works"}</span>
            </div>
            {documentaries.length ? <div className="video-grid">{documentaries.map((work) => <WorkCard key={`documentary-${work.id}`} locale={locale} work={work} />)}</div> : <div className="empty-state"><strong>{ar ? "لا توجد وثائقيات منشورة بعد." : "No documentaries published yet."}</strong></div>}
          </section>
        </div>
      )}
    </section>
  );
}

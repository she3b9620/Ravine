import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const copy = {
  ar: {
    eyebrow: "RAVINE / 01",
    title: "ادخل عالمًا من الأعمال التي تستحق أن تُرى.",
    body: "منصة إبداعية سينمائية تضع العمل وسياقه وصانعيه في المركز — لا الضجيج ولا الشعبية وحدهما.",
    discover: "اكتشف الأعمال",
    creators: "تعرف على المبدعين",
    featured: "أعمال مختارة",
    empty: "لا توجد أعمال منشورة بعد.",
    views: "مشاهدة",
    likes: "إعجاب",
    principle: "الجودة قبل الضجيج.",
    principleBody: "التقدير، الاكتشاف، والسمعة أنظمة مختلفة. النجاح هنا لا يُختزل في عدد المشاهدات.",
  },
  en: {
    eyebrow: "RAVINE / 01",
    title: "Enter a world of work worth seeing.",
    body: "A cinematic creative platform built around the work, its context, and the people behind it — not noise or popularity alone.",
    discover: "Discover work",
    creators: "Meet creators",
    featured: "Selected work",
    empty: "No published work yet.",
    views: "views",
    likes: "likes",
    principle: "Quality before noise.",
    principleBody: "Rating, discovery, and reputation remain distinct. Success here is never reduced to a view count.",
  },
} as const;

type Locale = "ar" | "en";

type Work = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
  creators: { name: string | null; username: string | null } | null;
};

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${minutes}:${String(remaining).padStart(2, "0")}`;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const t = copy[locale];
  const supabase = await createClient();

  const { data } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,creators(name,username)")
    .eq("published", true)
    .order("created_at", { ascending: false })
    .limit(6);

  const works = (data ?? []) as Work[];

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.body}</p>
          <div className="hero-actions">
            <Link className="button primary" href={`/${locale}/discover`}>{t.discover}</Link>
            <Link className="button secondary" href={`/${locale}/creators`}>{t.creators}</Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / FEATURED</div>
            <h2>{t.featured}</h2>
          </div>
          <Link className="button secondary" href={`/${locale}/videos`}>{t.discover}</Link>
        </div>

        {!works.length ? (
          <div className="empty-state">
            <strong>{t.empty}</strong>
          </div>
        ) : (
          <div className="video-grid">
            {works.map((work) => {
              const creatorLabel = work.creators?.name || (work.creators?.username ? `@${work.creators.username}` : locale === "ar" ? "مبدع" : "Creator");
              return (
                <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
                  <div className="video-thumb">
                    <img src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
                    <span className="duration">{formatDuration(work.duration)}</span>
                  </div>
                  <div className="video-meta">
                    <div className="video-kicker">{work.content_type || "WORK"}{work.quality ? ` · ${work.quality}` : ""}</div>
                    <h2>{work.title || (locale === "ar" ? "عمل بدون عنوان" : "Untitled work")}</h2>
                    <p>{creatorLabel}</p>
                    <div className="video-stats">
                      <span>{Number(work.views || 0).toLocaleString()} {t.views}</span>
                      <span>{Number(work.likes || 0).toLocaleString()} {t.likes}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / PRINCIPLE</div>
            <h2>{t.principle}</h2>
          </div>
          <p className="section-note">{t.principleBody}</p>
        </div>
      </section>
    </>
  );
}

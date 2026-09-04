import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowCreator from "@/components/FollowCreator";
import styles from "./creator-profile.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Creator = {
  id: number;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number | null;
  user_id: string | null;
};

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
};

function formatDuration(seconds: number | null, fallback: string) {
  if (!seconds || seconds < 1) return fallback;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export default async function CreatorProfilePage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const creatorId = Number(id);

  if (!Number.isInteger(creatorId) || creatorId < 1) notFound();

  const supabase = await createClient();
  const [{ data: creatorData, error: creatorError }, { data: worksData }] = await Promise.all([
    supabase
      .from("creators")
      .select("id,name,username,avatar_url,bio,specialty,followers,user_id")
      .eq("id", creatorId)
      .maybeSingle(),
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality")
      .eq("creator_id", creatorId)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(24),
  ]);

  const creator = creatorData as Creator | null;
  const works = (worksData || []) as Work[];

  if (creatorError || !creator) notFound();

  const totalViews = works.reduce((sum, work) => sum + Number(work.views || 0), 0);
  const totalLikes = works.reduce((sum, work) => sum + Number(work.likes || 0), 0);
  const specialty = creator.specialty || (ar ? "صانع أعمال إبداعية" : "Creative maker");
  const displayName = creator.name || creator.username || (ar ? "مبدع RAVINE" : "RAVINE Creator");

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      <section className={`${styles.hero} section`}>
        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.heroGlow} />
          <div className={styles.heroFrame} />
        </div>

        <div className={styles.heroGrid}>
          <div className={styles.avatarWrap}>
            <img
              className={styles.avatar}
              src={creator.avatar_url || "/RAVINE.png"}
              alt=""
            />
          </div>

          <div className={styles.identity}>
            <div className="eyebrow">RAVINE / CREATOR</div>
            <div className={styles.nameRow}>
              <h1>{displayName}</h1>
            </div>
            <div className={styles.handleLine}>
              @{creator.username || `creator-${creator.id}`} <span>·</span> {specialty}
            </div>
            <p className={styles.bio}>
              {creator.bio ||
                (ar
                  ? "هوية إبداعية من مجتمع RAVINE، تُعرَف من خلال الأعمال المنشورة لا من الضجيج حولها."
                  : "A creative identity from the RAVINE community, defined through the work rather than the noise around it.")}
            </p>

            <div className={styles.actions}>
              <FollowCreator creatorId={creator.id} creatorUserId={creator.user_id} locale={locale} />
              <Link className="button secondary" href={`/${locale}/creators`}>
                {ar ? "استكشف المبدعين" : "Explore creators"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.identityBar} section`} aria-label={ar ? "ملخص المبدع" : "Creator summary"}>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "التخصص" : "Specialty"}</span>
          <strong>{specialty}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "الأعمال" : "Works"}</span>
          <strong>{works.length.toLocaleString(locale)}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "المشاهدات عبر الأعمال" : "Views across work"}</span>
          <strong>{totalViews.toLocaleString(locale)}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "المتابعون" : "Followers"}</span>
          <strong>{Number(creator.followers || 0).toLocaleString(locale)}</strong>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / BODY OF WORK</div>
            <h2>{ar ? "الأعمال المنشورة" : "Published work"}</h2>
          </div>
          <p className="section-note">
            {ar
              ? "ملف المبدع يبدأ من العمل نفسه: الصورة، الحرفة، والاستمرارية عبر الأعمال."
              : "A creator profile starts with the work itself: craft, visual language, and consistency across pieces."}
          </p>
        </div>

        {!works.length ? (
          <div className="empty-state">
            <strong>{ar ? "لا توجد أعمال منشورة بعد." : "No published work yet."}</strong>
            <span>{ar ? "سيظهر هنا العمل العام لهذا المبدع عند نشره." : "Public work will appear here as this creator publishes."}</span>
          </div>
        ) : (
          <div className={styles.workGrid}>
            {works.map((work, index) => (
              <Link href={`/${locale}/watch/${work.id}`} className={styles.workCard} key={work.id}>
                <div className={styles.workVisual}>
                  <img src={work.thumbnail_url || "/RAVINE.png"} alt="" />
                  <div className={styles.workIndex}>{String(index + 1).padStart(2, "0")}</div>
                  <div className={styles.workDuration}>{formatDuration(work.duration, "—")}</div>
                </div>
                <div className={styles.workBody}>
                  <div className="video-kicker">
                    {work.content_type || "WORK"}{work.quality ? ` · ${work.quality}` : ""}
                  </div>
                  <h3>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h3>
                  <p>{work.description || (ar ? "عمل إبداعي من هذا المبدع." : "A creative work by this creator.")}</p>
                  <div className={styles.workMeta}>
                    <span>{Number(work.views || 0).toLocaleString(locale)} {ar ? "مشاهدة" : "views"}</span>
                    <span>{Number(work.likes || 0).toLocaleString(locale)} {ar ? "إعجاب" : "likes"}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section className={`${styles.reputation} section`}>
        <div className={styles.reputationGrid}>
          <div>
            <div className="eyebrow">RAVINE / IDENTITY</div>
            <h2>{ar ? "الهوية قبل الأرقام" : "Identity before numbers"}</h2>
          </div>
          <div className={styles.reputationCopy}>
            <p>
              {ar
                ? "هذه الصفحة تُعرّف المبدع من خلال اسمه، تخصصه، سيرته، وأعماله. أنظمة Credits وReputation متعددة الأبعاد ستظهر فقط عندما تتوافر بياناتها الرسمية في المنصة."
                : "This page defines the creator through name, specialty, biography, and published work. Credits and multidimensional Reputation will appear only when their official platform data exists."}
            </p>
            <div className={styles.signalRow}>
              <div><span>{ar ? "إعجابات على الأعمال" : "Likes on work"}</span><strong>{totalLikes.toLocaleString(locale)}</strong></div>
              <div><span>{ar ? "نطاق الملف" : "Portfolio scope"}</span><strong>{works.length ? (ar ? "نشط" : "Active") : "قيد البناء"}</strong></div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

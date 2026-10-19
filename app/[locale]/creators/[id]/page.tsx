import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FollowCreator from "@/components/FollowCreator";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";
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
type Profile = { cover_url: string | null; website_url: string | null; bio: string | null };
type CreatorEventRow = {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  live_type: string;
  mode: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
};
type Work = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
};

type WorkSection = { key: string; titleEn: string; titleAr: string; items: Work[] };

function formatDuration(seconds: number | null, fallback: string) {
  if (!seconds || seconds < 1) return fallback;
  const total = Math.round(seconds);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

function normalizeWorkType(contentType: string | null) {
  const value = (contentType || "work").trim().toLowerCase();
  if (["film", "films", "video", "videos", "work", "works"].includes(value)) return "video";
  if (["cut", "cuts", "short", "shorts"].includes(value)) return "cut";
  if (["documentary", "documentaries", "doc", "docs"].includes(value)) return "documentary";
  if (["podcast", "podcasts", "audio", "audio podcast"].includes(value)) return "podcast";
  if (["live", "livestream", "live stream"].includes(value)) return "live";
  if (["bts", "behind the scenes", "process"].includes(value)) return "bts";
  if (["series", "season", "episode", "episodes"].includes(value)) return "series";
  return "other";
}

function sectionMeta(key: string, ar: boolean) {
  const meta: Record<string, { en: string; ar: string }> = {
    video: { en: "Films & Video", ar: "الأفلام والفيديو" },
    cut: { en: "Cuts", ar: "كتس" },
    documentary: { en: "Documentaries", ar: "الوثائقيات" },
    podcast: { en: "Podcasts", ar: "البودكاست" },
    live: { en: "Live", ar: "مباشر" },
    bts: { en: "Behind the Scenes", ar: "خلف الكواليس" },
    series: { en: "Series & Seasons", ar: "السلاسل والمواسم" },
    other: { en: "Other Work", ar: "أعمال أخرى" },
  };
  const item = meta[key] || meta.other;
  return ar ? item.ar : item.en;
}

function buildWorkSections(works: Work[], ar: boolean): WorkSection[] {
  const order = ["video", "cut", "documentary", "podcast", "live", "series", "bts", "other"];
  const buckets = new Map<string, Work[]>();
  for (const work of works) {
    const key = normalizeWorkType(work.content_type);
    const list = buckets.get(key) || [];
    list.push(work);
    buckets.set(key, list);
  }

  return order
    .filter((key) => buckets.has(key))
    .map((key) => ({
      key,
      titleEn: sectionMeta(key, false),
      titleAr: sectionMeta(key, true),
      items: buckets.get(key) || [],
    }));
}

function WorkGrid({ works, locale, ar }: { works: Work[]; locale: Locale; ar: boolean }) {
  return (
    <div className={styles.workGrid}>
      {works.map((work, index) => (
        <Link href={`/${locale}/watch/${work.id}`} className={styles.workCard} key={work.id}>
          <div className={styles.workVisual}>
            <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" />
            <div className={styles.workIndex}>{String(index + 1).padStart(2, "0")}</div>
            <div className={styles.workDuration}>{formatDuration(work.duration, "—")}</div>
          </div>
          <div className={styles.workBody}>
            <div className="video-kicker">
              {work.content_type || "WORK"}
              {work.quality ? ` · ${work.quality}` : ""}
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
  );
}

export default async function CreatorProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ workPage?: string | string[] }>;
}) {
  const [{ locale: rawLocale, id }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const creatorId = Number(id);
  if (!Number.isInteger(creatorId) || creatorId < 1) notFound();
  const rawPage = Array.isArray(query.workPage) ? query.workPage[0] : query.workPage;
  const parsedPage = Number(rawPage);
  const requestedPage = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const pageSize = 24;

  const supabase = await createClient();
  const { data: creatorData, error: creatorError } = await supabase
    .from("creators")
    .select("id,name,username,avatar_url,bio,specialty,followers,user_id")
    .eq("id", creatorId)
    .maybeSingle();
  const creator = creatorData as Creator | null;
  if (creatorError || !creator) notFound();

  const { count: workTotalCount, error: workCountError } = await supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creatorId)
    .eq("published", true)
    .eq("visibility", "public");
  const totalWorkCount = workTotalCount ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalWorkCount / pageSize));
  const currentPage = Math.min(requestedPage, pageCount);

  const [worksResult, { data: profileData }, { data: eventData }, { data: trailerData }] = await Promise.all([
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality")
      .eq("creator_id", creatorId)
      .eq("published", true)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1),
    creator.user_id
      ? supabase.from("profiles").select("cover_url,website_url,bio").eq("id", creator.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("live_events")
      .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at")
      .eq("creator_id", creatorId)
      .in("status", ["scheduled", "live"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(12),
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality")
      .eq("creator_id", creatorId)
      .eq("published", true)
      .eq("visibility", "public")
      .not("video_url", "is", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const creatorEvents = ((eventData ?? []) as CreatorEventRow[]).map((event): RAVINEEventItem => ({
    id: event.id,
    title: event.title,
    description: event.description,
    type: event.live_type,
    mode: event.mode,
    status: event.status,
    scheduledAt: event.scheduled_at,
    startedAt: event.started_at,
    endedAt: event.ended_at,
    creatorId: creator.id,
    creatorName: creator.name || creator.username || (ar ? "مبدع رَافِين" : "RAVINE creator"),
    creatorAvatar: creator.avatar_url,
    recordingHref: null,
    detailHref: "/" + locale + "/events/" + event.id,
  }));
  const works = (worksResult.data || []) as Work[];
  const workQueryError = Boolean(workCountError || worksResult.error);
  const profile = profileData as Profile | null;
  const trailer = (trailerData as Work | null) || (currentPage === 1 ? works.find((w) => Boolean(w.video_url)) ?? null : null);
  const totalViews = works.reduce((s, w) => s + Number(w.views || 0), 0);
  const totalLikes = works.reduce((s, w) => s + Number(w.likes || 0), 0);

  function creatorWorkPageHref(targetPage: number) {
    const params = new URLSearchParams({ workPage: String(targetPage) });
    return "/" + locale + "/creators/" + creatorId + "?" + params.toString() + "#creator-works";
  }
  const specialty = creator.specialty || (ar ? "صانع أعمال إبداعية" : "Creative maker");
  const displayName = creator.name || creator.username || (ar ? "مبدع RAVINE" : "RAVINE Creator");
  const visualBio =
    profile?.bio ||
    creator.bio ||
    (ar
      ? "هوية إبداعية من مجتمع RAVINE، تُعرَف من خلال الأعمال المنشورة لا من الضجيج حولها."
      : "A creative identity from the RAVINE community, defined through the work rather than the noise around it.");
  const workSections = buildWorkSections(works, ar);

  return (
    <main className={styles.page} dir={ar ? "rtl" : "ltr"}>
      <section className={`${styles.hero} section`}>
        <div
          className={styles.cover}
          style={
            profile?.cover_url
              ? {
                  backgroundImage: `linear-gradient(180deg,rgba(9,9,9,.08),rgba(9,9,9,.92)),url(${profile.cover_url})`,
                }
              : undefined
          }
          aria-hidden="true"
        >
          <div className={styles.heroGlow} />
          <div className={styles.heroFrame} />
        </div>
        <div className={styles.heroGrid}>
          <div className={styles.avatarWrap}>
            <img className={styles.avatar} src={creator.avatar_url || "/RAVINE.PNG"} alt="" />
          </div>
          <div className={styles.identity}>
            <div className="eyebrow">RAVINE / CREATOR</div>
            <div className={styles.nameRow}>
              <h1>{displayName}</h1>
            </div>
            <div className={styles.handleLine}>
              @{creator.username || `creator-${creator.id}`} <span>·</span> {specialty}
            </div>
            <p className={styles.bio}>{visualBio}</p>
            <div className={styles.actions}>
              <FollowCreator creatorId={creator.id} creatorUserId={creator.user_id} locale={locale} />
              {creator.user_id ? (
                <Link
                  className="button secondary"
                  href={`/${locale}/messages?to=${encodeURIComponent(creator.user_id)}&creator=${creator.id}`}
                >
                  {ar ? "مراسلة المبدع" : "Message creator"}
                </Link>
              ) : null}
              <Link className="button secondary" href={`/${locale}/creators`}>
                {ar ? "استكشف المبدعين" : "Explore creators"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {trailer?.video_url ? (
        <section className={`${styles.introSection} section`}>
          <div className={styles.introGrid}>
            <div>
              <div className="eyebrow">RAVINE / VISUAL BIO</div>
              <h2>{ar ? "قدّم نفسك بصريًا." : "Introduce yourself visually."}</h2>
              <p className={styles.introText}>
                {ar
                  ? "مساحة قصيرة يقدّم فيها المبدع لغته البصرية وطريقته في العمل قبل الدخول إلى جسم أعماله."
                  : "A short visual introduction to the creator’s language and process before entering the body of work."}
              </p>
              {profile?.website_url ? (
                <a className="button secondary" href={profile.website_url} target="_blank" rel="noreferrer">
                  {ar ? "الموقع الشخصي" : "Personal site"}
                </a>
              ) : null}
            </div>
            <div className={styles.trailerCard}>
              <video
                className={styles.trailer}
                controls
                muted
                playsInline
                preload="metadata"
                poster={trailer.thumbnail_url || undefined}
                src={trailer.video_url}
              />
              <div className={styles.trailerCaption}>
                <span>{ar ? "التريلر / التعريف البصري" : "Trailer / Visual introduction"}</span>
                <strong>{trailer.title || displayName}</strong>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {creatorEvents.length ? (
        <section className="section" aria-label={ar ? "أحداث المبدع القادمة" : "Upcoming creator events"}>
          <div className="section-head">
            <div>
              <div className="eyebrow">RAVINE / EVENTS</div>
              <h2>{ar ? "مواعيد هذا المبدع." : "This creator’s upcoming sessions."}</h2>
              <p className="section-note">{ar ? "الجلسات المجدولة والمباشرة التي أعلن عنها هذا المبدع." : "Scheduled and live sessions announced by this creator."}</p>
            </div>
            <Link className="button secondary" href={"/" + locale + "/events"}>{ar ? "كل الأحداث" : "All events"}</Link>
          </div>
          <RAVINEEventsCatalog locale={locale} items={creatorEvents} />
        </section>
      ) : null}

      <section className={`${styles.identityBar} section`} aria-label={ar ? "ملخص المبدع" : "Creator summary"}>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "التخصص" : "Specialty"}</span>
          <strong>{specialty}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "الأعمال المنشورة" : "Published works"}</span>
          <strong>{workQueryError ? "—" : totalWorkCount.toLocaleString(locale)}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "مشاهدات الأعمال المعروضة" : "Views on shown works"}</span>
          <strong>{totalViews.toLocaleString(locale)}</strong>
        </div>
        <div className={styles.identityBlock}>
          <span className={styles.label}>{ar ? "المتابعون" : "Followers"}</span>
          <strong>{Number(creator.followers || 0).toLocaleString(locale)}</strong>
        </div>
      </section>

      <div id="creator-works">
      {workQueryError ? (
        <section className="section">
          <div className="empty-state" role="alert">
            <strong>{ar ? "تعذّر تحميل الأعمال." : "We could not load this creator's work."}</strong>
            <span>{ar ? "تعذّر جلب قائمة الأعمال الآن. أعد المحاولة بعد قليل." : "The published work list could not be retrieved. Please try again shortly."}</span>
          </div>
        </section>
      ) : workSections.length ? (
        <>
          {workSections.map((section) => (
            <section className="section" key={section.key}>
              <div className="section-head">
                <div>
                  <div className="eyebrow">RAVINE / {section.titleEn.toUpperCase()}</div>
                  <h2>{ar ? section.titleAr : section.titleEn}</h2>
                </div>
                <p className="section-note">
                  {ar
                    ? "قسم مستقل داخل جسم أعمال المبدع، مرتب حسب نوع المحتوى للحفاظ على هوية كل تجربة."
                    : "A dedicated part of the creator’s body of work, organized by content type to keep each experience distinct."}
                </p>
              </div>
              <WorkGrid works={section.items} locale={locale} ar={ar} />
            </section>
          ))}
        </>
      ) : (
        <section className="section">
          <div className="section-head">
            <div>
              <div className="eyebrow">RAVINE / BODY OF WORK</div>
              <h2>{ar ? "الأعمال المنشورة" : "Published work"}</h2>
            </div>
          </div>
          <div className="empty-state">
            <strong>{ar ? "لا توجد أعمال منشورة بعد." : "No published work yet."}</strong>
            <span>{ar ? "سيظهر هنا العمل العام لهذا المبدع عند نشره." : "Public work will appear here as this creator publishes."}</span>
          </div>
        </section>
      )}
        {!workQueryError && totalWorkCount > 0 ? (
          <p className={styles.workPaginationSummary} aria-live="polite">
            {ar
              ? `عرض ${((currentPage - 1) * pageSize + 1).toLocaleString(locale)}–${Math.min(currentPage * pageSize, totalWorkCount).toLocaleString(locale)} من ${totalWorkCount.toLocaleString(locale)} عمل`
              : `Showing ${((currentPage - 1) * pageSize + 1).toLocaleString(locale)}–${Math.min(currentPage * pageSize, totalWorkCount).toLocaleString(locale)} of ${totalWorkCount.toLocaleString(locale)} works`}
          </p>
        ) : null}
        {!workQueryError && pageCount > 1 ? (
          <nav className={styles.workPagination} aria-label={ar ? "صفحات أعمال المبدع" : "Creator work pages"}>
            {currentPage > 1
              ? <Link className={styles.workPageLink} href={creatorWorkPageHref(currentPage - 1)}>{ar ? "السابق" : "Previous"}</Link>
              : <span className={styles.workPageDisabled} aria-disabled="true">{ar ? "السابق" : "Previous"}</span>}
            <span className={styles.workPageIndicator} aria-current="page">
              {ar ? `صفحة ${currentPage.toLocaleString(locale)} من ${pageCount.toLocaleString(locale)}` : `Page ${currentPage.toLocaleString(locale)} of ${pageCount.toLocaleString(locale)}`}
            </span>
            {currentPage < pageCount
              ? <Link className={styles.workPageLink} href={creatorWorkPageHref(currentPage + 1)}>{ar ? "التالي" : "Next"}</Link>
              : <span className={styles.workPageDisabled} aria-disabled="true">{ar ? "التالي" : "Next"}</span>}
          </nav>
        ) : null}
      </div>

      <section className={`${styles.reputation} section`}>
        <div className={styles.reputationGrid}>
          <div>
            <div className="eyebrow">RAVINE / IDENTITY</div>
            <h2>{ar ? "الهوية قبل الأرقام" : "Identity before numbers"}</h2>
          </div>
          <div className={styles.reputationCopy}>
            <p>
              {ar
                ? "هذه الصفحة تُعرّف المبدع من خلال اسمه، تخصصه، سيرته، الغلاف، المقدمة البصرية، وأعماله. أنظمة Credits وReputation متعددة الأبعاد ستظهر فقط عندما تتوافر بياناتها الرسمية في المنصة."
                : "This page defines the creator through name, specialty, biography, cover, visual introduction, and published work. Credits and multidimensional Reputation will appear only when their official platform data exists."}
            </p>
            <div className={styles.signalRow}>
              <div>
                <span>{ar ? "إعجابات الأعمال المعروضة" : "Likes on shown works"}</span>
                <strong>{totalLikes.toLocaleString(locale)}</strong>
              </div>
              <div>
                <span>{ar ? "نطاق الملف" : "Portfolio scope"}</span>
                <strong>{totalWorkCount ? (ar ? "نشط" : "Active") : ar ? "قيد البناء" : "Building"}</strong>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import "./home-enhancements.module.css";

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
    selections: "مختارات RAVINE",
    selectionsBody: "أفق تحريري واحد يتغير حسب المدة، بدل تقسيم الصفحة إلى قوائم متكررة.",
    daily: "يومية",
    weekly: "أسبوعية",
    monthly: "شهرية",
    yearly: "سنوية",
    pathways: "طرق الاكتشاف",
    trending: "Trending",
    rising: "Rising",
    hidden: "Hidden Gems",
    featuredPath: "Featured",
    creatorsTitle: "الأشخاص خلف الأعمال",
    creatorsBody: "الهوية الإبداعية والاعتمادات والسمعة جزء من العمل نفسه.",
    liveTitle: "Live",
    podcastTitle: "Podcasts",
    emptyLive: "لا توجد جلسات Live منشورة بعد.",
    emptyPodcast: "لا توجد حلقات Podcast منشورة بعد.",
    aboutEyebrow: "RAVINE / ABOUT",
    aboutTitle: "ليست منصة فيديو أخرى.",
    aboutBody: "RAVINE مساحة حول قيمة العمل: تكتشف العمل، تفهم سياقه، تصل إلى صانعيه واعتماداته، ثم تنتقل إلى المجتمع وLive وPodcast.",
    quality: "الجودة قبل الضجيج.",
    qualityBody: "التقدير، الاكتشاف، والسمعة أنظمة مختلفة. النجاح هنا لا يُختزل في عدد المشاهدات.",
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
    selections: "RAVINE Selections",
    selectionsBody: "One editorial horizon that changes by time period instead of becoming four duplicated feeds.",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    pathways: "Discovery paths",
    trending: "Trending",
    rising: "Rising",
    hidden: "Hidden Gems",
    featuredPath: "Featured",
    creatorsTitle: "The people behind the work",
    creatorsBody: "Creative identity, credits, and reputation are part of the work itself.",
    liveTitle: "Live",
    podcastTitle: "Podcasts",
    emptyLive: "No published Live sessions yet.",
    emptyPodcast: "No published podcast episodes yet.",
    aboutEyebrow: "RAVINE / ABOUT",
    aboutTitle: "Not another video platform.",
    aboutBody: "RAVINE is a space around the value of work: discover it, understand its context, find the people and credits behind it, then continue into community, Live, and Podcast experiences.",
    quality: "Quality before noise.",
    qualityBody: "Rating, discovery, and reputation remain distinct. Success here is never reduced to a view count.",
  },
} as const;

type Locale = "ar" | "en";

type Creator = {
  id: number;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  specialty: string | null;
  followers: number | null;
};

type WorkCreator = { name: string | null; username: string | null };

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
  creators: WorkCreator[] | WorkCreator | null;
};

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getCreator(creator: Work["creators"]) {
  return Array.isArray(creator) ? creator[0] ?? null : creator;
}

function getCreatorLabel(creator: Work["creators"], locale: Locale) {
  const normalized = getCreator(creator);
  return normalized?.name || (normalized?.username ? `@${normalized.username}` : locale === "ar" ? "مبدع" : "Creator");
}

function WorkCard({ work, locale, views, likes }: { work: Work; locale: Locale; views: string; likes: string }) {
  return (
    <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
      <div className="video-thumb">
        <img src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
        <span className="duration">{formatDuration(work.duration)}</span>
      </div>
      <div className="video-meta">
        <div className="video-kicker">{work.content_type || "WORK"}{work.quality ? ` · ${work.quality}` : ""}</div>
        <h2>{work.title || (locale === "ar" ? "عمل بدون عنوان" : "Untitled work")}</h2>
        <p>{getCreatorLabel(work.creators, locale)}</p>
        <div className="video-stats">
          <span>{Number(work.views || 0).toLocaleString()} {views}</span>
          <span>{Number(work.likes || 0).toLocaleString()} {likes}</span>
        </div>
      </div>
    </Link>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const t = copy[locale];
  const supabase = await createClient();

  const [{ data: worksData }, { data: creatorsData }] = await Promise.all([
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,creators(name,username)")
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("creators")
      .select("id,name,username,avatar_url,specialty,followers")
      .order("followers", { ascending: false, nullsFirst: false })
      .limit(6),
  ]);

  const works = (worksData ?? []) as Work[];
  const creators = (creatorsData ?? []) as Creator[];
  const liveWorks = works.filter((work) => work.content_type === "live").slice(0, 3);
  const podcastWorks = works.filter((work) => work.content_type === "podcast").slice(0, 3);
  const discoveryWork = works.filter((work) => work.content_type !== "live" && work.content_type !== "podcast").slice(0, 4);

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

      <section className="section selection-section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / SELECT</div>
            <h2>{t.selections}</h2>
            <p className="section-note selection-note">{t.selectionsBody}</p>
          </div>
          <div className="selection-tabs" aria-label={locale === "ar" ? "مدة المختارات" : "Selection period"}>
            <span className="selection-tab active">{t.daily}</span>
            <span className="selection-tab">{t.weekly}</span>
            <span className="selection-tab">{t.monthly}</span>
            <span className="selection-tab">{t.yearly}</span>
          </div>
        </div>
        {discoveryWork.length ? (
          <div className="video-grid">
            {discoveryWork.map((work) => <WorkCard key={work.id} work={work} locale={locale} views={t.views} likes={t.likes} />)}
          </div>
        ) : (
          <div className="empty-state"><strong>{t.empty}</strong></div>
        )}
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / DISCOVER</div>
            <h2>{t.pathways}</h2>
          </div>
          <Link className="button secondary" href={`/${locale}/discover`}>{t.discover}</Link>
        </div>
        <div className="pathway-grid">
          <Link href={`/${locale}/discover?type=video`} className="pathway-card"><span>01</span><strong>{t.trending}</strong><p>{locale === "ar" ? "حركة الأعمال والانتباه إليها الآن." : "Current movement and attention around work."}</p></Link>
          <Link href={`/${locale}/discover?type=short`} className="pathway-card"><span>02</span><strong>{t.rising}</strong><p>{locale === "ar" ? "مساحات للأعمال والمبدعين الصاعدين." : "A path for emerging work and creators."}</p></Link>
          <Link href={`/${locale}/discover?type=video`} className="pathway-card"><span>03</span><strong>{t.hidden}</strong><p>{locale === "ar" ? "واجهة للاكتشاف حتى عندما يكون التعرض منخفضًا." : "A discovery surface for strong work with low exposure."}</p></Link>
          <Link href={`/${locale}/discover`} className="pathway-card"><span>04</span><strong>{t.featuredPath}</strong><p>{locale === "ar" ? "ما تضعه RAVINE في واجهة التجربة." : "Work the platform chooses to spotlight."}</p></Link>
        </div>
      </section>

      <section className="section">
        <div className="section-head">
          <div>
            <div className="eyebrow">RAVINE / CREATORS</div>
            <h2>{t.creatorsTitle}</h2>
            <p className="section-note">{t.creatorsBody}</p>
          </div>
          <Link className="button secondary" href={`/${locale}/creators`}>{t.creators}</Link>
        </div>
        {creators.length ? (
          <div className="creator-strip">
            {creators.map((creator) => (
              <Link key={creator.id} href={`/${locale}/creators/${creator.id}`} className="creator-feature">
                <div className="creator-feature-avatar"><img src={creator.avatar_url || "/RAVINE.png"} alt="" loading="lazy" /></div>
                <div>
                  <div className="video-kicker">{creator.specialty || "CREATOR"}</div>
                  <strong>{creator.name || `Creator ${creator.id}`}</strong>
                  <span>@{creator.username || `creator-${creator.id}`}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state"><strong>{locale === "ar" ? "لا يوجد مبدعون منشورون بعد." : "No published creators yet."}</strong></div>
        )}
      </section>

      <section className="section media-section">
        <div className="media-column">
          <div className="section-head compact">
            <div><div className="eyebrow">RAVINE / LIVE</div><h2>{t.liveTitle}</h2></div>
            <Link className="button secondary" href={`/${locale}/live`}>{t.discover}</Link>
          </div>
          {liveWorks.length ? <div className="mini-grid">{liveWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} views={t.views} likes={t.likes} />)}</div> : <div className="empty-state"><strong>{t.emptyLive}</strong></div>}
        </div>
        <div className="media-column">
          <div className="section-head compact">
            <div><div className="eyebrow">RAVINE / PODCAST</div><h2>{t.podcastTitle}</h2></div>
            <Link className="button secondary" href={`/${locale}/podcasts`}>{t.discover}</Link>
          </div>
          {podcastWorks.length ? <div className="mini-grid">{podcastWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} views={t.views} likes={t.likes} />)}</div> : <div className="empty-state"><strong>{t.emptyPodcast}</strong></div>}
        </div>
      </section>

      <section className="section about-section">
        <div className="about-grid">
          <div>
            <div className="eyebrow">{t.aboutEyebrow}</div>
            <h2>{t.aboutTitle}</h2>
          </div>
          <div>
            <p className="about-lead">{t.aboutBody}</p>
            <div className="about-principles">
              <div><strong>{t.quality}</strong><span>{t.qualityBody}</span></div>
              <div><strong>{locale === "ar" ? "المبدعون لا القنوات." : "Creators, not channels."}</strong><span>{locale === "ar" ? "الهوية المهنية والعمل والاعتمادات أهم من واجهة قناة عامة." : "Professional identity, work, and credits matter more than a generic channel shell."}</span></div>
              <div><strong>{locale === "ar" ? "الرسم البياني الإبداعي." : "The Creative Graph."}</strong><span>{locale === "ar" ? "من العمل إلى صانعيه واعتماداته ومجتمعه ثم Live وPodcast." : "Move from a work to its creators, credits, community, Live, and Podcast."}</span></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

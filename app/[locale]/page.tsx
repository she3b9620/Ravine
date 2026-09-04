import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AuthTrigger from "@/components/AuthTrigger";
import "./home-enhancements.module.css";

const copy = {
  ar: {
    guestEyebrow: "رَافِين / للضيوف",
    guestTitle: "ادخل عالمًا من الأعمال التي تستحق أن تُرى.",
    guestBody: "شاهد عيّنة من الأعمال، تعرّف على المبدعين، وافهم فكرة رَافِين قبل أن تسجّل. التفاعل الكامل يبدأ بعد إنشاء حسابك.",
    signup: "أنشئ حسابك",
    discover: "استكشف الأعمال",
    guestPreview: "هذه مجرد نافذة صغيرة على عالم رَافِين.",
    guestPreviewBody: "أعمال، مبدعون، أفكار، جلسات مباشرة، وبرامج صوتية — كلها مترابطة حول قيمة العمل وسياقه ومن يقف خلفه.",
    works: "أعمال مختارة",
    creators: "مبدعون",
    ideas: "أفكار للاكتشاف",
    quality: "الجودة قبل الضجيج",
    qualityBody: "الأرقام تساعدك على الاكتشاف، لكنها ليست تعريفًا للقيمة.",
    identity: "المبدعون لا القنوات",
    identityBody: "الهوية والاعتمادات والجسم الكامل من الأعمال جزء من التجربة.",
    graph: "شبكة الإبداع",
    graphBody: "من العمل إلى المبدع والاعتمادات والمجتمع ثم الجلسات المباشرة والبرامج الصوتية.",
    selections: "مختارات رَافِين",
    selectionsBody: "أفق تحريري واحد: يومي، أسبوعي، شهري، سنوي.",
    daily: "يومية",
    weekly: "أسبوعية",
    monthly: "شهرية",
    yearly: "سنوية",
    creatorsTitle: "الأشخاص خلف الأعمال",
    creatorsBody: "الهوية الإبداعية والاعتمادات والسمعة جزء من العمل نفسه.",
    liveTitle: "الجلسات المباشرة",
    podcastTitle: "البرامج الصوتية",
    empty: "لا توجد أعمال منشورة بعد.",
    emptyCreators: "لا يوجد مبدعون منشورون بعد.",
    emptyLive: "لا توجد جلسات مباشرة منشورة بعد.",
    emptyPodcast: "لا توجد حلقات صوتية منشورة بعد.",
    viewerEyebrow: "رَافِين / مساحتك",
    viewerTitle: "مساحتك تبدأ من العمل.",
    viewerBody: "هذه هي الصفحة الرئيسية للمستخدم المسجّل: موجز مستمر، أعمال من الأشخاص الذين تتابعهم، ومسارات اكتشاف قريبة.",
    forYou: "لك",
    following: "المتابَعون",
    followingEmpty: "تابع بعض المبدعين وسيظهر محتواهم هنا.",
    browseCreators: "اكتشف المبدعين",
    communityEyebrow: "رَافِين / المجتمعات",
    communityTitle: "مجتمع يحيط بالعمل، لا يبتلعه.",
    communityBody: "تبدأ الرحلة من المجتمع العام، ثم مجتمعات الموضوعات، ثم مجتمعات المبدعين ومجموعات المستخدمين — مع مساحات نخبة لاحقًا وفق نظام الأهلية والمراجعة.",
    communityGeneral: "المجتمع العام",
    communityTopics: "مجتمعات الموضوعات",
    communityCreators: "مجتمعات المبدعين",
    communityGroups: "مجموعات المستخدمين",
    communityLoop: "من العمل إلى الحوار ثم الجلسة المباشرة والبرنامج الصوتي والعودة إلى المجتمع.",
  },
  en: {
    guestEyebrow: "RAVINE / FOR GUESTS",
    guestTitle: "Enter a world of work worth seeing.",
    guestBody: "Preview the work, meet the people behind it, and understand RAVINE before you sign up. Full interaction begins after account creation.",
    signup: "Create your account",
    discover: "Explore work",
    guestPreview: "A small window into the RAVINE world.",
    guestPreviewBody: "Work, creators, ideas, Live and Podcast are connected around the value of the work and the people behind it.",
    works: "Selected work",
    creators: "Creators",
    ideas: "Discovery ideas",
    quality: "Quality before noise",
    qualityBody: "Numbers can help discovery without becoming the definition of value.",
    identity: "Creators, not channels",
    identityBody: "Identity, credits and the body of work belong to the experience.",
    graph: "The Creative Graph",
    graphBody: "Move from work to creator, credits, community, Live and Podcast.",
    selections: "RAVINE Selections",
    selectionsBody: "One editorial horizon: daily, weekly, monthly, yearly.",
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
    creatorsTitle: "The people behind the work",
    creatorsBody: "Creative identity, credits, and reputation are part of the work itself.",
    liveTitle: "Live",
    podcastTitle: "Podcasts",
    empty: "No published work yet.",
    emptyCreators: "No published creators yet.",
    emptyLive: "No published Live sessions yet.",
    emptyPodcast: "No published podcast episodes yet.",
    viewerEyebrow: "RAVINE / YOUR WORLD",
    viewerTitle: "Your home starts with the work.",
    viewerBody: "This is the signed-in home: a continuous feed, work from people you follow, and nearby discovery paths.",
    forYou: "For You",
    following: "Following",
    followingEmpty: "Follow a few creators and their work will appear here.",
    browseCreators: "Discover creators",
    communityEyebrow: "RAVINE / COMMUNITIES",
    communityTitle: "A community around the work, not over it.",
    communityBody: "The journey moves from the platform community to topic communities, creator communities and user groups — with elite spaces later under eligibility and review rules.",
    communityGeneral: "General community",
    communityTopics: "Topic communities",
    communityCreators: "Creator communities",
    communityGroups: "User groups",
    communityLoop: "From work to conversation to Live and Podcast, then back into the community.",
  },
} as const;

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null; followers: number | null };
type WorkCreator = { name: string | null; username: string | null };
type Work = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; content_type: string | null; quality: string | null; creator_id: number | null; creators: WorkCreator[] | WorkCreator | null };

export const dynamic = "force-dynamic";

function formatDuration(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}` : `${minutes}:${String(remaining).padStart(2, "0")}`;
}

function getCreator(creator: Work["creators"]) { return Array.isArray(creator) ? creator[0] ?? null : creator; }
function creatorLabel(creator: Work["creators"], locale: Locale) {
  const value = getCreator(creator);
  return value?.name || (value?.username ? `@${value.username}` : locale === "ar" ? "مبدع" : "Creator");
}
function contentTypeLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "WORK";
  const labels: Record<string, string> = { short: "قصير", video: "فيديو", film: "فيلم", documentary: "وثائقي", podcast: "برنامج صوتي", live: "جلسة مباشرة", photo: "صورة", work: "عمل" };
  return labels[value?.toLowerCase() || "work"] || value || "عمل";
}
function qualityLabel(value: string | null, locale: Locale) {
  if (locale !== "ar") return value || "";
  const labels: Record<string, string> = { hd: "عالي الدقة", fullhd: "عالي الدقة", uhd: "فائق الدقة", "4k": "فائق الدقة 4K", "8k": "فائق الدقة 8K" };
  return value ? labels[value.toLowerCase()] || value : "";
}

function WorkCard({ work, locale, actionLabel }: { work: Work; locale: Locale; actionLabel?: string }) {
  const type = contentTypeLabel(work.content_type, locale);
  const quality = qualityLabel(work.quality, locale);
  return (
    <Link href={`/${locale}/watch/${work.id}`} className="video-card">
      <div className="video-thumb">
        <img src={work.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy" />
        <span className="duration">{formatDuration(work.duration)}</span>
      </div>
      <div className="video-meta">
        <div className="video-kicker">{type}{quality ? ` · ${quality}` : ""}</div>
        <h2>{work.title || (locale === "ar" ? "عمل بدون عنوان" : "Untitled work")}</h2>
        <p>{creatorLabel(work.creators, locale)}</p>
        <div className="video-stats">
          <span>{Number(work.views || 0).toLocaleString()} {locale === "ar" ? "مشاهدة" : "views"}</span>
          <span>{Number(work.likes || 0).toLocaleString()} {locale === "ar" ? "إعجاب" : "likes"}</span>
          {actionLabel ? <span className="home-card-action">{actionLabel}</span> : null}
        </div>
      </div>
    </Link>
  );
}

function CreatorCard({ creator, locale }: { creator: Creator; locale: Locale }) {
  return (
    <Link href={`/${locale}/creators/${creator.id}`} className="creator-feature">
      <div className="creator-feature-avatar"><img src={creator.avatar_url || "/RAVINE.png"} alt="" loading="lazy" /></div>
      <div>
        <div className="video-kicker">{locale === "ar" ? "مبدع" : (creator.specialty || "CREATOR")}</div>
        <strong>{creator.name || (locale === "ar" ? `مبدع ${creator.id}` : `Creator ${creator.id}`)}</strong>
        <span>@{creator.username || `creator-${creator.id}`}</span>
      </div>
    </Link>
  );
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const t = copy[locale];
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();
  const user = authData.user;

  let works: Work[] = [];
  let creators: Creator[] = [];
  let followingWorks: Work[] = [];
  let displayName = "";

  try {
    const [profileResult, worksResult, creatorsResult] = await Promise.all([
      user ? supabase.from("profiles").select("display_name,username").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,creator_id,creators(name,username)").eq("published", true).order("created_at", { ascending: false }).limit(18),
      supabase.from("creators").select("id,name,username,avatar_url,specialty,followers").order("followers", { ascending: false, nullsFirst: false }).limit(6),
    ]);
    if (worksResult.error) throw worksResult.error;
    works = (worksResult.data ?? []) as Work[];
    creators = (creatorsResult.data ?? []) as Creator[];
    displayName = profileResult.data?.display_name || profileResult.data?.username || user?.email?.split("@")[0] || "";

    if (user) {
      const followResult = await supabase.from("follows").select("creator_id").eq("follower_id", user.id).limit(20);
      const ids = (followResult.data ?? []).map((item) => item.creator_id).filter((id): id is number => typeof id === "number");
      if (ids.length) {
        const followingResult = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,creator_id,creators(name,username)").eq("published", true).in("creator_id", ids).order("created_at", { ascending: false }).limit(12);
        if (!followingResult.error) followingWorks = (followingResult.data ?? []) as Work[];
      }
    }
  } catch {
    works = [];
    creators = [];
    followingWorks = [];
  }

  const publicWorks = works.filter((work) => work.content_type !== "live" && work.content_type !== "podcast").slice(0, 6);
  const liveWorks = works.filter((work) => work.content_type === "live").slice(0, 3);
  const podcastWorks = works.filter((work) => work.content_type === "podcast").slice(0, 3);
  const feedWorks = works.slice(0, 12);

  if (user) {
    return (
      <div className="home-viewer">
        <section className="hero home-viewer-hero">
          <div className="hero-inner">
            <div className="home-state-kicker">{t.viewerEyebrow}</div>
            <h1>{displayName ? (locale === "ar" ? `أهلًا ${displayName}.` : `Welcome, ${displayName}.`) : t.viewerTitle}</h1>
            <p>{t.viewerBody}</p>
          </div>
        </section>

        <section className="section home-feed-section">
          <div className="home-feed-head">
            <div>
              <div className="home-feed-label">{locale === "ar" ? "رَافِين / الموجز" : "RAVINE / FEED"}</div>
              <h1>{t.forYou}</h1>
              <p className="home-feed-intro">{locale === "ar" ? "مزيج من الأعمال الحديثة ومسارات الاكتشاف المفتوحة لك الآن." : "A mix of recent work and discovery paths open to you now."}</p>
            </div>
            <Link className="button secondary" href={`/${locale}/discover`}>{t.discover}</Link>
          </div>
          {feedWorks.length ? <div className="home-feed-grid">{feedWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.empty}</strong></div>}
        </section>

        <section className="section home-feed-section">
          <div className="home-feed-head">
            <div>
              <div className="home-feed-label">{locale === "ar" ? "رَافِين / المتابَعون" : "RAVINE / FOLLOWING"}</div>
              <h1>{t.following}</h1>
            </div>
            <Link className="button secondary" href={`/${locale}/creators`}>{t.browseCreators}</Link>
          </div>
          {followingWorks.length ? <div className="home-feed-grid">{followingWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="home-feed-following-empty">{t.followingEmpty}</div>}
        </section>

        <section className="section">
          <div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / الاكتشاف" : "RAVINE / DISCOVER"}</div><h2>{t.selections}</h2><p className="section-note">{t.selectionsBody}</p></div><div className="selection-tabs"><span className="selection-tab active">{t.daily}</span><span className="selection-tab">{t.weekly}</span><span className="selection-tab">{t.monthly}</span><span className="selection-tab">{t.yearly}</span></div></div>
          <div className="video-grid">{publicWorks.slice(0, 4).map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div>
        </section>

        <section className="section home-community-teaser">
          <div className="section-head"><div><div className="eyebrow">{t.communityEyebrow}</div><h2>{t.communityTitle}</h2><p className="section-note">{t.communityBody}</p></div><Link className="button secondary" href={`/${locale}/community`}>{locale === "ar" ? "دخول المجتمعات" : "Enter communities"}</Link></div>
          <div className="home-community-path"><span>{t.communityGeneral}</span><i>→</i><span>{t.communityTopics}</span><i>→</i><span>{t.communityCreators}</span><i>→</i><span>{t.communityGroups}</span></div>
          <p className="home-community-loop">{t.communityLoop}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="home-guest">
      <section className="hero home-guest-hero">
        <div className="hero-inner">
          <div className="home-state-kicker">{t.guestEyebrow}</div>
          <h1>{t.guestTitle}</h1>
          <p>{t.guestBody}</p>
          <div className="home-state-actions"><AuthTrigger locale={locale} label={t.signup} /><Link className="button secondary" href={`/${locale}/discover`}>{t.discover}</Link></div>
        </div>
      </section>

      <section className="section">
        <div className="home-guest-preview">
          <div>
            <div className="eyebrow">{locale === "ar" ? "رَافِين / معاينة" : "RAVINE / PREVIEW"}</div>
            <h2>{t.guestPreview}</h2>
            <p className="home-guest-intro">{t.guestPreviewBody}</p>
            <div className="video-grid">{publicWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div>
          </div>
          <div className="home-guest-note"><strong>{locale === "ar" ? "شاهد، تعرّف، ثم انضم." : "See it. Understand it. Then join."}</strong><p>{locale === "ar" ? "التصفح العام متاح للضيوف، بينما الإعجاب والحفظ والمتابعة والتقييم والمجتمعات والموجز الشخصي تحتاج إلى حساب." : "Public browsing stays open to guests; liking, saving, following, rating, community actions and a personal feed require an account."}</p></div>
        </div>
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / المبدعون" : "RAVINE / PEOPLE"}</div><h2>{t.creatorsTitle}</h2><p className="section-note">{t.creatorsBody}</p></div></div>
        {creators.length ? <div className="creator-strip">{creators.slice(0, 4).map((creator) => <CreatorCard key={creator.id} creator={creator} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.emptyCreators}</strong></div>}
      </section>

      <section className="section">
        <div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / أفكار" : "RAVINE / IDEAS"}</div><h2>{t.ideas}</h2></div><Link className="button secondary" href={`/${locale}/discover`}>{t.discover}</Link></div>
        <div className="home-gated-row">
          <div className="home-gated-item"><span>01</span><strong>{t.quality}</strong><p>{t.qualityBody}</p></div>
          <div className="home-gated-item"><span>02</span><strong>{t.identity}</strong><p>{t.identityBody}</p></div>
          <div className="home-gated-item"><span>03</span><strong>{t.graph}</strong><p>{t.graphBody}</p></div>
        </div>
      </section>

      <section className="section home-community-teaser">
        <div className="section-head"><div><div className="eyebrow">{t.communityEyebrow}</div><h2>{t.communityTitle}</h2><p className="section-note">{t.communityBody}</p></div><Link className="button secondary" href={`/${locale}/community`}>{locale === "ar" ? "استكشف المجتمعات" : "Explore communities"}</Link></div>
        <div className="home-community-path"><span>{t.communityGeneral}</span><i>→</i><span>{t.communityTopics}</span><i>→</i><span>{t.communityCreators}</span><i>→</i><span>{t.communityGroups}</span></div>
        <p className="home-community-loop">{t.communityLoop}</p>
      </section>

      <section className="section selection-section">
        <div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / المختارات" : "RAVINE / SELECT"}</div><h2>{t.selections}</h2><p className="section-note selection-note">{t.selectionsBody}</p></div><div className="selection-tabs"><span className="selection-tab active">{t.daily}</span><span className="selection-tab">{t.weekly}</span><span className="selection-tab">{t.monthly}</span><span className="selection-tab">{t.yearly}</span></div></div>
        {publicWorks.length ? <div className="video-grid">{publicWorks.slice(0, 4).map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.empty}</strong></div>}
      </section>

      <section className="section media-section">
        <div className="media-column"><div className="section-head compact"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / جلسات مباشرة" : "RAVINE / LIVE"}</div><h2>{t.liveTitle}</h2></div><Link className="button secondary" href={`/${locale}/live`}>{t.discover}</Link></div>{liveWorks.length ? <div className="mini-grid">{liveWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.emptyLive}</strong></div>}</div>
        <div className="media-column"><div className="section-head compact"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / برامج صوتية" : "RAVINE / PODCAST"}</div><h2>{t.podcastTitle}</h2></div><Link className="button secondary" href={`/${locale}/podcasts`}>{t.discover}</Link></div>{podcastWorks.length ? <div className="mini-grid">{podcastWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.emptyPodcast}</strong></div>}</div>
      </section>
    </div>
  );
}

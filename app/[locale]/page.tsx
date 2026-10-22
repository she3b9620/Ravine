import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AuthTrigger from "@/components/AuthTrigger";
import GuestCinematicBackdrop from "@/components/GuestCinematicBackdrop";
import HomeWorkCard, { type HomeWork } from "@/components/HomeWorkCard";
import RavineHeroVideoButton from "@/components/RavineHeroVideoButton";
import "./home-enhancements.module.css";

const copy = {
  ar: {
    guestEyebrow: "رَافِين / للضيوف", guestTitle: "ادخل عالمًا من الأعمال التي تستحق أن تُرى.", guestBody: "شاهد عيّنة من الأعمال، تعرّف على المبدعين، وافهم فكرة رَافِين قبل أن تسجّل. التفاعل الكامل يبدأ بعد إنشاء حسابك.", signup: "أنشئ حسابك", discover: "استكشف الأعمال", guestPreview: "هذه مجرد نافذة صغيرة على عالم رَافِين.", guestPreviewBody: "أعمال، مبدعون، أفكار، جلسات مباشرة، وبرامج صوتية — كلها مترابطة حول قيمة العمل وسياقه ومن يقف خلفه.", ideas: "أفكار للاكتشاف", quality: "الجودة قبل الضجيج", qualityBody: "الأرقام تساعدك على الاكتشاف، لكنها ليست تعريفًا للقيمة.", identity: "المبدعون لا القنوات", identityBody: "الهوية والاعتمادات والجسم الكامل من الأعمال جزء من التجربة.", graph: "شبكة الإبداع", graphBody: "من العمل إلى المبدع والاعتمادات والمجتمع ثم الجلسات المباشرة والبرامج الصوتية.", selections: "مختارات رَافِين", selectionsBody: "أفق تحريري واحد: يومي، أسبوعي، شهري، سنوي.", daily: "يومية", weekly: "أسبوعية", monthly: "شهرية", yearly: "سنوية", creatorsTitle: "الأشخاص خلف الأعمال", creatorsBody: "الهوية الإبداعية والاعتمادات والسمعة جزء من العمل نفسه.", liveTitle: "الجلسات المباشرة", podcastTitle: "البرامج الصوتية", empty: "لا توجد أعمال منشورة بعد.", emptyCreators: "لا يوجد مبدعون منشورون بعد.", emptyLive: "لا توجد جلسات مباشرة منشورة بعد.", emptyPodcast: "لا توجد حلقات صوتية منشورة بعد.", viewerEyebrow: "رَافِين / مساحتك", viewerTitle: "مساحتك تبدأ من العمل.", viewerBody: "موجز غني من الأعمال الحديثة، ما يتابعُه المستخدم، ومسارات اكتشاف متجاورة — تجربة ممتدة وليست لوحة فارغة.", forYou: "لك", following: "تتابعهم", followingEmpty: "تابع بعض المبدعين وسيظهر محتواهم هنا.", browseCreators: "اكتشف المبدعين", latest: "الأحدث", trending: "الأكثر حركة", hiddenGems: "جواهر مخفية", shorts: "الشورتات", more: "عرض الكل", communityEyebrow: "رَافِين / المجتمعات", communityTitle: "مجتمع يحيط بالعمل، لا يبتلعه.", communityBody: "تبدأ الرحلة من المجتمع العام، ثم مجتمعات الموضوعات، ثم مجتمعات المبدعين ومجموعات المستخدمين — مع مساحات نخبة لاحقًا وفق نظام الأهلية والمراجعة.", communityGeneral: "المجتمع العام", communityTopics: "مجتمعات الموضوعات", communityCreators: "مجتمعات المبدعين", communityGroups: "مجموعات المستخدمين", communityLoop: "من العمل إلى الحوار ثم الجلسة المباشرة والبرنامج الصوتي والعودة إلى المجتمع."
  },
  en: {
    guestEyebrow: "RAVINE / FOR GUESTS", guestTitle: "Enter a world of work worth seeing.", guestBody: "Preview the work, meet the people behind it, and understand RAVINE before you sign up. Full interaction begins after account creation.", signup: "Create your account", discover: "Explore work", guestPreview: "A small window into the RAVINE world.", guestPreviewBody: "Work, creators, ideas, Live and Podcast are connected around the value of the work and the people behind it.", ideas: "Discovery ideas", quality: "Quality before noise", qualityBody: "Numbers can help discovery without becoming the definition of value.", identity: "Creators, not channels", identityBody: "Identity, credits and the body of work belong to the experience.", graph: "The Creative Graph", graphBody: "Move from work to creator, credits, community, Live and Podcast.", selections: "RAVINE Selections", selectionsBody: "One editorial horizon: daily, weekly, monthly, yearly.", daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly", creatorsTitle: "The people behind the work", creatorsBody: "Creative identity, credits, and reputation are part of the work itself.", liveTitle: "Live", podcastTitle: "Podcasts", empty: "No published work yet.", emptyCreators: "No published creators yet.", emptyLive: "No published Live sessions yet.", emptyPodcast: "No published podcast episodes yet.", viewerEyebrow: "RAVINE / YOUR WORLD", viewerTitle: "Your home starts with the work.", viewerBody: "A rich stream of recent work, what you follow, and adjacent discovery paths — a living home rather than an empty dashboard.", forYou: "For You", following: "Following", followingEmpty: "Follow a few creators and their work will appear here.", browseCreators: "Discover creators", latest: "Latest", trending: "Trending now", hiddenGems: "Hidden Gems", shorts: "Shorts", more: "View all", communityEyebrow: "RAVINE / COMMUNITIES", communityTitle: "A community around the work, not over it.", communityBody: "The journey moves from the platform community to topic communities, creator communities and user groups — with elite spaces later under eligibility and review rules.", communityGeneral: "General community", communityTopics: "Topic communities", communityCreators: "Creator communities", communityGroups: "User groups", communityLoop: "From work to conversation to Live and Podcast, then back into the community."
  }
} as const;

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null; followers: number | null };
type ViewerProfile = { display_name: string | null; username: string | null; avatar_url: string | null };
export const dynamic = "force-dynamic";



function WorkCard({ work, locale, compact = false }: { work: HomeWork; locale: Locale; compact?: boolean }) { return <HomeWorkCard work={work} locale={locale} compact={compact} />; }
function CreatorCard({ creator, locale }: { creator: Creator; locale: Locale }) {
  return <Link href={`/${locale}/creators/${creator.id}`} className="creator-feature"><div className="creator-feature-avatar"><img src={creator.avatar_url || "/RAVINE.PNG"} alt="" loading="lazy" /></div><div><div className="video-kicker">{locale === "ar" ? "مبدع" : (creator.specialty || "CREATOR")}</div><strong>{creator.name || (locale === "ar" ? `مبدع ${creator.id}` : `Creator ${creator.id}`)}</strong><span>@{creator.username || `creator-${creator.id}`}</span></div></Link>;
}
function Rail({ title, eyebrow, action, href, works, locale, compact = false }: { title: string; eyebrow: string; action?: string; href?: string; works: HomeWork[]; locale: Locale; compact?: boolean }) {
  return <section className={`section home-rail-section${compact ? " compact" : ""}`}><div className="home-rail-head"><div><div className="home-feed-label">{eyebrow}</div><h2>{title}</h2></div>{href && action ? <Link className="home-rail-link" href={href}>{action} <span aria-hidden="true">→</span></Link> : null}</div>{works.length ? <div className="home-rail">{works.map((work) => <WorkCard key={work.id} work={work} locale={locale} compact={compact} />)}</div> : null}</section>;
}

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params; const locale: Locale = rawLocale === "en" ? "en" : "ar"; const t = copy[locale];
  const supabase = await createClient(); const { data: authData } = await supabase.auth.getUser(); const user = authData.user;
  let works: HomeWork[] = []; let creators: Creator[] = []; let followingWorks: HomeWork[] = []; let viewer: ViewerProfile | null = null;
  try {
    const [profileResult, worksResult, creatorsResult] = await Promise.all([
      user ? supabase.from("profiles").select("display_name,username,avatar_url").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
      supabase.from("videos").select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality,creator_id,creators(name,username)").eq("published", true).eq("visibility", "public").order("created_at", { ascending: false }).limit(60),
      supabase.from("creators").select("id,name,username,avatar_url,specialty,followers").order("followers", { ascending: false, nullsFirst: false }).limit(10)
    ]);
    viewer = (profileResult.data ?? null) as ViewerProfile | null;
    works = (worksResult.data ?? []) as HomeWork[]; creators = (creatorsResult.data ?? []) as Creator[];
    if (user) {
      const followResult = await supabase.from("follows").select("creator_id").eq("follower_id", user.id).limit(30);
      const ids = (followResult.data ?? []).map((item) => item.creator_id).filter((id): id is number => typeof id === "number");
      if (ids.length) { const followingResult = await supabase.from("videos").select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality,creator_id,creators(name,username)").eq("published", true).in("creator_id", ids).order("created_at", { ascending: false }).limit(18); if (!followingResult.error) followingWorks = (followingResult.data ?? []) as HomeWork[]; }
    }
  } catch { works = []; creators = []; followingWorks = []; viewer = null; }
  // Keep server-rendered feed order deterministic across browser-tab returns.
  // The base query is newest-first; trend and hidden-gem rails use explicit
  // popularity ordering rather than a fresh random shuffle on every render.
  const publicWorks = works.filter((work) => work.content_type !== "live" && work.content_type !== "podcast");
  const liveWorks = works.filter((work) => work.content_type === "live").slice(0, 4);
  const podcastWorks = works.filter((work) => work.content_type === "podcast").slice(0, 4);
  const shortsWorks = publicWorks.filter((work) => work.content_type === "short").slice(0, 10);
  const latestWorks = publicWorks.slice(0, 12);
  const trendingWorks = [...publicWorks].sort((a, b) => Number(b.views || 0) - Number(a.views || 0)).slice(0, 12);
  const hiddenGemWorks = [...publicWorks].sort((a, b) => Number(a.views || 0) - Number(b.views || 0)).slice(0, 12);
  const displayName = viewer?.display_name || viewer?.username || user?.email?.split("@")[0] || "";

  if (user) return <div className="home-viewer">
    <section className="hero home-viewer-hero">
      <div className="hero-inner home-viewer-hero-inner">
        <div className="home-viewer-welcome-copy"><div className="home-state-kicker">{t.viewerEyebrow}</div><h1>{displayName ? (locale === "ar" ? `أهلًا ${displayName}.` : `Welcome, ${displayName}.`) : t.viewerTitle}</h1><p>{t.viewerBody}</p></div>
        <Link href={`/${locale}/account`} className="home-viewer-profile" aria-label={locale === "ar" ? "فتح الحساب" : "Open account"}>
          <div className="home-viewer-profile-halo"><div className="home-viewer-profile-avatar">{viewer?.avatar_url ? <img src={viewer.avatar_url} alt={locale === "ar" ? `صورة ${displayName}` : `${displayName} profile`} /> : <span>{displayName.slice(0, 1).toUpperCase() || "R"}</span>}</div></div>
          <div className="home-viewer-profile-copy"><strong>{displayName || (locale === "ar" ? "حسابك" : "Your account")}</strong><span>{viewer?.username ? `@${viewer.username}` : (locale === "ar" ? "مساحتك الشخصية" : "Your personal space")}</span></div>
        </Link>
      </div>
    </section>
    <section className="section home-primary-feed home-feed-section"><div className="home-feed-head"><div><div className="home-feed-label">{locale === "ar" ? "رَافِين / الموجز" : "RAVINE / FEED"}</div><h1>{t.forYou}</h1><p className="home-feed-intro">{locale === "ar" ? "أعمال مختارة من أحدث الإصدارات، مع المعاينة الصامتة عند الوقوف على الصورة." : "Recent work with silent hover previews when you pause over a thumbnail."}</p></div><Link className="button secondary" href={`/${locale}/discover`}>{t.more}</Link></div>{latestWorks.length ? <div className="home-feed-grid home-dense-grid">{latestWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.empty}</strong></div>}</section>
    <Rail title={t.trending} eyebrow={locale === "ar" ? "رَافِين / الآن" : "RAVINE / NOW"} action={t.more} href={`/${locale}/discover?sort=trending`} works={trendingWorks} locale={locale} />
    {followingWorks.length ? <Rail title={t.following} eyebrow={locale === "ar" ? "رَافِين / تتابعهم" : "RAVINE / FOLLOWING"} action={t.browseCreators} href={`/${locale}/creators`} works={followingWorks} locale={locale} /> : <section className="section home-following-nudge"><div><div className="home-feed-label">{locale === "ar" ? "رَافِين / المتابَعة" : "RAVINE / FOLLOWING"}</div><h2>{t.following}</h2><p>{t.followingEmpty}</p></div><Link className="button secondary" href={`/${locale}/creators`}>{t.browseCreators}</Link></section>}
    {shortsWorks.length ? <Rail title={t.shorts} eyebrow="RAVINE / SHORTS" action={t.more} href={`/${locale}/shorts`} works={shortsWorks} locale={locale} compact /> : null}
    <Rail title={t.hiddenGems} eyebrow={locale === "ar" ? "رَافِين / مخفية" : "RAVINE / HIDDEN"} action={t.more} href={`/${locale}/discover?sort=hidden`} works={hiddenGemWorks} locale={locale} />
    <section className="section home-creator-discovery"><div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / الأشخاص" : "RAVINE / PEOPLE"}</div><h2>{t.creatorsTitle}</h2><p className="section-note">{t.creatorsBody}</p></div><Link className="button secondary" href={`/${locale}/creators`}>{t.browseCreators}</Link></div>{creators.length ? <div className="creator-strip">{creators.map((creator) => <CreatorCard key={creator.id} creator={creator} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.emptyCreators}</strong></div>}</section>
    <section className="section selection-section"><div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / المختارات" : "RAVINE / SELECT"}</div><h2>{t.selections}</h2><p className="section-note selection-note">{t.selectionsBody}</p></div><div className="selection-tabs"><span className="selection-tab active">{t.daily}</span><span className="selection-tab">{t.weekly}</span><span className="selection-tab">{t.monthly}</span><span className="selection-tab">{t.yearly}</span></div></div><div className="video-grid">{publicWorks.slice(0, 6).map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div></section>
    <section className="section home-media-split"><div className="media-column"><div className="section-head compact"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / مباشر" : "RAVINE / LIVE"}</div><h2>{t.liveTitle}</h2></div><Link className="button secondary" href={`/${locale}/live`}>{t.more}</Link></div>{liveWorks.length ? <div className="mini-grid">{liveWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} compact />)}</div> : <div className="empty-state"><strong>{t.emptyLive}</strong></div>}</div><div className="media-column"><div className="section-head compact"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / صوت" : "RAVINE / AUDIO"}</div><h2>{t.podcastTitle}</h2></div><Link className="button secondary" href={`/${locale}/podcasts`}>{t.more}</Link></div>{podcastWorks.length ? <div className="mini-grid">{podcastWorks.map((work) => <WorkCard key={work.id} work={work} locale={locale} compact />)}</div> : <div className="empty-state"><strong>{t.emptyPodcast}</strong></div>}</div></section>
    <section className="section home-community-teaser"><div className="section-head"><div><div className="eyebrow">{t.communityEyebrow}</div><h2>{t.communityTitle}</h2><p className="section-note">{t.communityBody}</p></div><Link className="button secondary" href={`/${locale}/community`}>{locale === "ar" ? "دخول المجتمعات" : "Enter communities"}</Link></div><div className="home-community-path"><span>{t.communityGeneral}</span><i>→</i><span>{t.communityTopics}</span><i>→</i><span>{t.communityCreators}</span><i>→</i><span>{t.communityGroups}</span></div><p className="home-community-loop">{t.communityLoop}</p></section>
  </div>;

  return (
    <div className="home-guest ravine-reference-home">
      <section className="hero home-guest-hero ravine-reference-hero">
        <GuestCinematicBackdrop locale={locale} />
        <div className="hero-inner ravine-reference-hero-inner">
          <span className="ravine-reference-hero-kicker" dir="ltr">R A V I N E</span>
          <h1>{locale === "ar" ? "حيث تلتقي القصص بالمبدعين" : "Where stories meet creators"}</h1>
          <p>{locale === "ar" ? "منصة سينمائية تجمع بين الأعمال الإبداعية وصنّاعها. اكتشف قصصًا جديدة، وتواصل مع مبدعين من جميع أنحاء العالم." : "A cinematic platform bringing creative work and its makers together. Discover new stories and connect with creators around the world."}</p>
          <div className="home-state-actions ravine-reference-hero-actions">
            <Link className="button ravine-reference-cta-primary" href={"/" + locale + "/discover"}>{t.discover}</Link>
            <RavineHeroVideoButton locale={locale} />
          </div>
          <div className="ravine-reference-slide-meta" dir="ltr" aria-label={locale === "ar" ? "شرائح الواجهة" : "Hero slides"}>
            <span className="is-active">01</span><span>02</span><span>03</span><i aria-hidden="true"><b /></i>
          </div>
        </div>
        <span className="ravine-reference-scroll-mark" aria-hidden="true"><i />SCROLL</span>
      </section>

      <div className="ravine-reference-overview">
        <section className="ravine-reference-featured" aria-labelledby="ravine-featured-heading">
          <div className="ravine-reference-section-heading" dir="rtl">
            <h2 id="ravine-featured-heading">{locale === "ar" ? "أعمال مختارة" : "Featured work"}</h2>
            <Link href={"/" + locale + "/discover"}>{locale === "ar" ? "عرض الكل" : "View all"} <span aria-hidden="true">←</span></Link>
          </div>
          {publicWorks.length ? (
            <div className="ravine-reference-work-grid" dir="ltr">
              {publicWorks.slice(0, 4).map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}
            </div>
          ) : (
            <div className="ravine-reference-empty">{t.empty}</div>
          )}
        </section>

        <aside className="ravine-reference-intro-panel" dir="rtl">
          <h2>{locale === "ar" ? "منصة للإبداع والتواصل" : "A platform for creativity and connection"}</h2>
          <p>{locale === "ar" ? "رَافِين هي مساحة تجمع بين المواهب والأفكار، حيث يمكن للمبدعين عرض أعمالهم وبناء جمهورهم، واكتشاف محتوى استثنائي من مختلف أنحاء العالم." : "RAVINE brings talent and ideas together, helping creators present their work, grow an audience, and discover exceptional stories from around the world."}</p>
          <Link href={"/" + locale + "/about"}>{locale === "ar" ? "تعرّف على المزيد" : "Learn more"} <span aria-hidden="true">←</span></Link>
        </aside>
      </div>

      <div className="ravine-reference-mid-layout">
        <div className="ravine-reference-media-dark" dir="rtl">
          <section className="ravine-reference-media-block" aria-labelledby="ravine-live-heading">
            <div className="ravine-reference-section-heading compact">
              <h2 id="ravine-live-heading"><i className="ravine-reference-dot live" />{locale === "ar" ? "بث مباشر" : "Live"}</h2>
              <Link href={"/" + locale + "/live"}>{locale === "ar" ? "عرض الكل" : "View all"} <span aria-hidden="true">←</span></Link>
            </div>
            {liveWorks.length ? <div className="ravine-reference-media-card">{<WorkCard work={liveWorks[0]} locale={locale} compact />}</div> : <p className="ravine-reference-muted">{t.emptyLive}</p>}
          </section>

          <section className="ravine-reference-media-block podcast" aria-labelledby="ravine-podcast-heading">
            <div className="ravine-reference-section-heading compact">
              <h2 id="ravine-podcast-heading"><i className="ravine-reference-dot podcast" />{locale === "ar" ? "بودكاست" : "Podcasts"}</h2>
              <Link href={"/" + locale + "/podcasts"}>{locale === "ar" ? "عرض الكل" : "View all"} <span aria-hidden="true">←</span></Link>
            </div>
            {podcastWorks.length ? <div className="ravine-reference-media-card">{<WorkCard work={podcastWorks[0]} locale={locale} compact />}</div> : <p className="ravine-reference-muted">{t.emptyPodcast}</p>}
          </section>
        </div>

        <aside className="ravine-reference-creators-panel" dir="rtl">
          <div className="ravine-reference-section-heading compact">
            <h2>{locale === "ar" ? "مبدعون مميزون" : "Featured creators"}</h2>
            <Link className="ravine-reference-arrows" href={"/" + locale + "/creators"} aria-label={locale === "ar" ? "عرض المبدعين" : "Browse creators"}>‹ <span>›</span></Link>
          </div>
          {creators.length ? <div className="ravine-reference-creator-grid">{creators.slice(0, 4).map((creator) => <CreatorCard key={creator.id} creator={creator} locale={locale} />)}</div> : <p className="ravine-reference-muted">{t.emptyCreators}</p>}
        </aside>
      </div>

      <div className="ravine-reference-bottom-layout">
        <section className="ravine-reference-categories-panel" aria-labelledby="ravine-categories-heading" dir="rtl">
          <div className="ravine-reference-section-heading compact">
            <h2 id="ravine-categories-heading">{locale === "ar" ? "التصنيفات" : "Categories"}</h2>
            <Link href={"/" + locale + "/library"}>{locale === "ar" ? "عرض الكل" : "View all"} <span aria-hidden="true">←</span></Link>
          </div>
          <div className="ravine-reference-category-grid" dir="ltr">
            <Link className="ravine-reference-category-card" href={"/" + locale + "/films"}>
              <img src={publicWorks[0]?.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
              <span>{locale === "ar" ? "أفلام" : "Films"}</span>
            </Link>
            <Link className="ravine-reference-category-card" href={"/" + locale + "/documentaries"}>
              <img src={publicWorks[1]?.thumbnail_url || publicWorks[0]?.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
              <span>{locale === "ar" ? "وثائقيات" : "Documentaries"}</span>
            </Link>
            <Link className="ravine-reference-category-card" href={"/" + locale + "/series"}>
              <img src={publicWorks[2]?.thumbnail_url || publicWorks[0]?.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
              <span>{locale === "ar" ? "مسلسلات" : "Series"}</span>
            </Link>
          </div>
        </section>

        <aside className="ravine-reference-community-card" dir="rtl">
          <img className="ravine-reference-community-backdrop" src={publicWorks[3]?.thumbnail_url || publicWorks[0]?.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
          <div className="ravine-reference-community-content">
            <strong>{locale === "ar" ? "كن جزءًا من مجتمع RAVINE" : "Be part of the RAVINE community"}</strong>
            <p>{locale === "ar" ? "استكشف، شارك، وتواصل مع مبدعين من جميع أنحاء العالم." : "Explore, share, and connect with creators from around the world."}</p>
            <Link href={"/" + locale + "/community"}>{locale === "ar" ? "انضم الآن" : "Join now"} <span aria-hidden="true">←</span></Link>
          </div>
        </aside>
      </div>

      <section className="section selection-section ravine-reference-selection">
        <div className="section-head">
          <div><div className="eyebrow">{locale === "ar" ? "رَافِين / المختارات" : "RAVINE / SELECT"}</div><h2>{t.selections}</h2><p className="section-note selection-note">{t.selectionsBody}</p></div>
          <div className="selection-tabs"><span className="selection-tab active">{t.daily}</span><span className="selection-tab">{t.weekly}</span><span className="selection-tab">{t.monthly}</span><span className="selection-tab">{t.yearly}</span></div>
        </div>
        {publicWorks.length ? <div className="video-grid">{publicWorks.slice(0, 6).map((work) => <WorkCard key={work.id} work={work} locale={locale} />)}</div> : <div className="empty-state"><strong>{t.empty}</strong></div>}
      </section>

      <section className="section ravine-reference-ideas">
        <div className="section-head"><div><div className="eyebrow">{locale === "ar" ? "رَافِين / الفكرة" : "RAVINE / THE IDEA"}</div><h2>{t.ideas}</h2></div><Link className="button secondary" href={"/" + locale + "/discover"}>{t.discover}</Link></div>
        <div className="home-gated-row"><div className="home-gated-item"><span>01</span><strong>{t.quality}</strong><p>{t.qualityBody}</p></div><div className="home-gated-item"><span>02</span><strong>{t.identity}</strong><p>{t.identityBody}</p></div><div className="home-gated-item"><span>03</span><strong>{t.graph}</strong><p>{t.graphBody}</p></div></div>
        <div className="ravine-reference-community-path"><span>{t.communityGeneral}</span><i>→</i><span>{t.communityTopics}</span><i>→</i><span>{t.communityCreators}</span><i>→</i><span>{t.communityGroups}</span></div>
      </section>
    </div>
  );
}

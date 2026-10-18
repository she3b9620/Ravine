import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StudioUpload from "@/components/StudioUpload";
import StudioWorkManager from "@/components/StudioWorkManager";
import styles from "./studio.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type CreatorIdentity = { id: number; name: string; username: string | null; specialty: string | null; followers: number | null };

type Work = {
  id: number;
  series_id: number | null;
  title: string;
  description: string | null;
  content_type: string | null;
  quality: string | null;
  published: boolean | null;
  visibility: string | null;
  video_url: string | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
};

export default async function StudioPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ workPage?: string | string[]; creatorId?: string | string[] }> }) {
  const { locale: rawLocale } = await params;
  const query = await searchParams;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();

  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect(`/${locale}/auth?next=/${locale}/studio`);

  const [{ data: creatorRows, error: creatorsError }, { data: application }] = await Promise.all([
    supabase.from("creators").select("id,name,username,specialty,followers").eq("user_id", auth.user.id).order("created_at", { ascending: true }),
    supabase.from("creator_applications").select("status,created_at,reviewer_notes,reviewed_at").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const creators = (creatorRows ?? []) as CreatorIdentity[];
  const rawCreatorId = Array.isArray(query.creatorId) ? query.creatorId[0] : query.creatorId;
  const selectedCreatorId = rawCreatorId ? Number(rawCreatorId) : null;
  if (rawCreatorId && (
    !Number.isSafeInteger(selectedCreatorId)
    || !creators.some((item) => item.id === selectedCreatorId)
  )) {
    redirect(`/${locale}/studio`);
  }
  const creator = (selectedCreatorId
    ? creators.find((item) => item.id === selectedCreatorId)
    : creators[0]) ?? null;

  if (creatorsError) {
    return <section className="section studio-page"><div className="eyebrow">RAVINE / STUDIO</div>
      <div className="empty-state" role="status"><strong>{ar ? "تعذّر تحميل هويات المبدعين." : "Creator identities could not be loaded."}</strong>
        <span>{ar ? "تعذّر استرجاع هويات حسابك الآن. حاول تحديث الصفحة بعد قليل." : "Your creator identities could not be retrieved right now. Please refresh the page shortly."}</span>
      </div>
    </section>;
  }

  if (!creator) {
    return (
      <section className="section">
        <div className="eyebrow">RAVINE / STUDIO</div>
        <h1>{ar ? "مساحتك الإبداعية تبدأ من هنا." : "Your creative workspace starts here."}</h1>
        <p className="section-note">
          {application?.status === "pending"
            ? (ar ? "طلب المبدع الخاص بك قيد المراجعة. ستظهر أدوات Studio بعد القبول." : "Your creator application is under review. Studio tools appear after approval.")
            : (ar ? "قدّم طلب Creator أولًا. القبول يدوي ومبني على العمل والخبرة والسياق." : "Apply as a creator first. Admission is manual and based on work, experience, and context.")}
        </p>
        <Link className="button primary" href={`/${locale}/creator/apply`}>
          {application?.status === "pending" ? (ar ? "عرض الطلب" : "View application") : (ar ? "التقديم كمبدع" : "Apply as creator")}
        </Link>
      </section>
    );
  }

  const pageSize = 50;
  const rawPage = Array.isArray(query.workPage) ? query.workPage[0] : query.workPage;
  const requestedPage = Number(rawPage);
  const validRequestedPage = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // Count first, then clamp the requested page before asking PostgREST for a
  // range. A forged or stale giant page number must not create an invalid range
  // and turn an otherwise healthy Studio list into a false load error.
  const [{ count: totalWorks, error: totalWorksError }, publishedCountResult, draftCountResult] = await Promise.all([
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id).eq("published", true),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id).eq("published", false),
  ]);

  const safeTotalWorks = totalWorks ?? 0;
  const pageCount = Math.max(1, Math.ceil(safeTotalWorks / pageSize));
  const currentPage = Math.min(validRequestedPage, pageCount);

  let worksData: Work[] = [];
  let worksError = totalWorksError;
  if (!worksError) {
    const pageResult = await supabase
      .from("videos")
      .select("id,series_id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
      .eq("creator_id", creator.id)
      .order("created_at", { ascending: false })
      .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    worksData = (pageResult.data ?? []) as Work[];
    worksError = pageResult.error;
  }

  const works = worksData;
  const publishedCount = publishedCountResult.count;
  const draftCount = draftCountResult.count;
  const statisticsError = Boolean(totalWorksError || publishedCountResult.error || draftCountResult.error);

  return (
    <section className="section studio-page">
      <div className="eyebrow">RAVINE / STUDIO</div>
      <div className="section-head">
        <div>
          <h1>{ar ? `مرحبًا، ${creator.name}.` : `Welcome, ${creator.name}.`}</h1>
          <p className="section-note">{ar ? "مساحة العمل والإدارة الخاصة بهويتك الإبداعية." : "Your workspace for managing your creative identity and published work."}</p>
        </div>
        <Link className="button secondary" href={`/${locale}/creators/${creator.id}`}>{ar ? "فتح الملف العام" : "Open public profile"}</Link>
      </div>
      {creators.length > 1 ? <nav className={styles.creatorSwitch} dir={ar ? "rtl" : "ltr"} aria-label={ar ? "اختيار هوية المبدع" : "Choose creator identity"}>
        <span className={styles.creatorSwitchLabel}>{ar ? "الهويات الإبداعية" : "Creator identities"}</span>
        <div className={styles.creatorSwitchOptions}>
          {creators.map((identity) => <Link
            key={identity.id}
            href={`/${locale}/studio?creatorId=${identity.id}`}
            className={identity.id === creator.id ? styles.creatorOptionActive : styles.creatorOption}
            aria-current={identity.id === creator.id ? "page" : undefined}
          >
            <strong>{identity.name}</strong>
            <small>@{identity.username || `creator-${identity.id}`}</small>
          </Link>)}
        </div>
      </nav> : null}
      <div className="work-grid">
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">PROFILE</div><h3>{creator.specialty || "Creator"}</h3><p>@{creator.username || `creator-${creator.id}`}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">WORKS</div><h3>{statisticsError ? "—" : safeTotalWorks.toLocaleString(locale)}</h3><p>{statisticsError ? (ar ? "تعذّر تحميل الإحصاءات" : "Statistics unavailable") : (ar ? `${Number(publishedCount || 0).toLocaleString(locale)} منشور · ${Number(draftCount || 0).toLocaleString(locale)} مسودة` : `${Number(publishedCount || 0).toLocaleString(locale)} published · ${Number(draftCount || 0).toLocaleString(locale)} drafts`)}</p></div></article>
        <article className="work"><div className="work-art"/><div className="work-body"><div className="work-kicker">AUDIENCE</div><h3>{Number(creator.followers || 0).toLocaleString()}</h3><p>{ar ? "متابع" : "followers"}</p></div></article>
      </div>
      <StudioUpload creatorId={creator.id} locale={locale} />
      {worksError ? <div className="empty-state" role="status"><strong>{ar ? "تعذّر تحميل قائمة الأعمال." : "Your work list could not be loaded."}</strong><span>{ar ? "تعذّر استرجاع الأعمال الآن. حاول تحديث الصفحة بعد قليل." : "Your works could not be retrieved right now. Please refresh the page shortly."}</span></div> : <>
        <div className={styles.paginationSummary} dir={ar ? "rtl" : "ltr"}>
          <span>{ar
            ? `عرض ${safeTotalWorks === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, safeTotalWorks)} من ${safeTotalWorks.toLocaleString(locale)} عمل`
            : `Showing ${safeTotalWorks === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, safeTotalWorks)} of ${safeTotalWorks.toLocaleString(locale)} works`}</span>
        </div>
        <p className={styles.paginationHint}>{ar
          ? "البحث والتصفية هنا يطبّقان على أعمال الصفحة الحالية فقط؛ استخدم التنقل أسفل القائمة للانتقال بين الصفحات."
          : "Search and filters apply to the current page only. Use the navigation below the list to move between pages."}</p>
        <StudioWorkManager works={works} locale={locale} creatorId={creator.id} />
        {pageCount > 1 ? <nav className={styles.pagination} dir={ar ? "rtl" : "ltr"} aria-label={ar ? "صفحات الأعمال" : "Work pages"}>
          {currentPage > 1
            ? <Link className={styles.pageLink} href={`/${locale}/studio?creatorId=${creator.id}&workPage=${currentPage - 1}`}>{ar ? "السابق" : "Previous"}</Link>
            : <span className={styles.pageDisabled}>{ar ? "السابق" : "Previous"}</span>}
          <span className={styles.pageIndicator} aria-current="page">{ar
            ? `صفحة ${currentPage.toLocaleString(locale)} من ${pageCount.toLocaleString(locale)}`
            : `Page ${currentPage.toLocaleString(locale)} of ${pageCount.toLocaleString(locale)}`}</span>
          {currentPage < pageCount
            ? <Link className={styles.pageLink} href={`/${locale}/studio?creatorId=${creator.id}&workPage=${currentPage + 1}`}>{ar ? "التالي" : "Next"}</Link>
            : <span className={styles.pageDisabled}>{ar ? "التالي" : "Next"}</span>}
        </nav> : null}
      </>}
    </section>
  );
}

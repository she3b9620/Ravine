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

export default async function StudioPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ workPage?: string | string[]; creatorId?: string | string[]; workSearch?: string | string[]; workStatus?: string | string[]; workType?: string | string[]; workSort?: string | string[] }> }) {
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

  const rawWorkSearch = Array.isArray(query.workSearch) ? query.workSearch[0] : query.workSearch;
  // Remove PostgREST expression delimiters and wildcard characters from user
  // input before using the term in the title/description OR filter.
  const workSearch = (typeof rawWorkSearch === "string" ? rawWorkSearch : "")
    .trim()
    .slice(0, 100)
    .replace(/[(),%_*"\\]/g, " ")
    .replace(/\s+/g, " ");
  const rawWorkStatus = Array.isArray(query.workStatus) ? query.workStatus[0] : query.workStatus;
  const workStatus = (["all", "published", "draft"].includes(rawWorkStatus || "") ? rawWorkStatus : "all") as "all" | "published" | "draft";
  const rawWorkType = Array.isArray(query.workType) ? query.workType[0] : query.workType;
  const allowedWorkTypes = ["all", "short", "video", "podcast", "documentary", "short_film", "film", "series"];
  const workType = (allowedWorkTypes.includes(rawWorkType || "") ? rawWorkType : "all") as "all" | "short" | "video" | "podcast" | "documentary" | "short_film" | "film" | "series";
  const rawWorkSort = Array.isArray(query.workSort) ? query.workSort[0] : query.workSort;
  const workSort = (["newest", "views", "likes", "title"].includes(rawWorkSort || "") ? rawWorkSort : "newest") as "newest" | "views" | "likes" | "title";

  // Keep overall profile statistics independent from filters, but count the
  // filtered result set separately so pagination always matches its query.
  const filteredCountQuery = supabase
    .from("videos")
    .select("id", { count: "exact", head: true })
    .eq("creator_id", creator.id);
  if (workStatus === "published") filteredCountQuery.eq("published", true);
  if (workStatus === "draft") filteredCountQuery.eq("published", false);
  if (workType !== "all") filteredCountQuery.eq("content_type", workType);
  if (workSearch) filteredCountQuery.or(`title.ilike.%${workSearch}%,description.ilike.%${workSearch}%`);

  const [{ count: totalWorks, error: totalWorksError }, publishedCountResult, draftCountResult, { count: filteredTotalWorks, error: filteredCountError }] = await Promise.all([
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id).eq("published", true),
    supabase.from("videos").select("id", { count: "exact", head: true }).eq("creator_id", creator.id).eq("published", false),
    filteredCountQuery,
  ]);

  const safeTotalWorks = totalWorks ?? 0;
  const safeFilteredTotalWorks = filteredTotalWorks ?? 0;
  const pageCount = Math.max(1, Math.ceil(safeFilteredTotalWorks / pageSize));
  const currentPage = Math.min(validRequestedPage, pageCount);

  let worksData: Work[] = [];
  let worksError = totalWorksError || filteredCountError;
  if (!worksError) {
    const pageRequest = supabase
      .from("videos")
      .select("id,series_id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
      .eq("creator_id", creator.id);
    if (workStatus === "published") pageRequest.eq("published", true);
    if (workStatus === "draft") pageRequest.eq("published", false);
    if (workType !== "all") pageRequest.eq("content_type", workType);
    if (workSearch) pageRequest.or(`title.ilike.%${workSearch}%,description.ilike.%${workSearch}%`);
    if (workSort === "views") {
      pageRequest.order("views", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
    } else if (workSort === "likes") {
      pageRequest.order("likes", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
    } else if (workSort === "title") {
      pageRequest.order("title", { ascending: true, nullsFirst: false }).order("id", { ascending: false });
    } else {
      pageRequest.order("created_at", { ascending: false, nullsFirst: false }).order("id", { ascending: false });
    }
    const pageResult = await pageRequest.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
    worksData = (pageResult.data ?? []) as Work[];
    worksError = pageResult.error;
  }

  const works = worksData;
  const publishedCount = publishedCountResult.count;
  const draftCount = draftCountResult.count;
  const statisticsError = Boolean(totalWorksError || publishedCountResult.error || draftCountResult.error);

  function studioPageHref(pageNumber: number) {
    const params = new URLSearchParams({ creatorId: String(creator.id), workPage: String(pageNumber) });
    if (workSearch) params.set("workSearch", workSearch);
    if (workStatus !== "all") params.set("workStatus", workStatus);
    if (workType !== "all") params.set("workType", workType);
    if (workSort !== "newest") params.set("workSort", workSort);
    return `/${locale}/studio?${params.toString()}`;
  }

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
            ? `عرض ${safeFilteredTotalWorks === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, safeFilteredTotalWorks)} من ${safeFilteredTotalWorks.toLocaleString(locale)} عمل مطابق`
            : `Showing ${safeFilteredTotalWorks === 0 ? 0 : (currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, safeFilteredTotalWorks)} of ${safeFilteredTotalWorks.toLocaleString(locale)} matching works`}</span>
        </div>
        <p className={styles.paginationHint}>{ar
          ? "البحث والتصفية والترتيب تطبّق على جميع أعمال هذه الهوية قبل تقسيم النتائج إلى صفحات."
          : "Search, filters, and sorting apply across this creator’s full catalogue before pagination."}</p>
        <StudioWorkManager
          works={works}
          locale={locale}
          creatorId={creator.id}
          resultCount={safeFilteredTotalWorks}
          totalWorksCount={safeTotalWorks}
          filters={{ search: workSearch, status: workStatus, type: workType, sort: workSort }}
        />
        {pageCount > 1 ? <nav className={styles.pagination} dir={ar ? "rtl" : "ltr"} aria-label={ar ? "صفحات الأعمال" : "Work pages"}>
          {currentPage > 1
            ? <Link className={styles.pageLink} href={studioPageHref(currentPage - 1)}>{ar ? "السابق" : "Previous"}</Link>
            : <span className={styles.pageDisabled}>{ar ? "السابق" : "Previous"}</span>}
          <span className={styles.pageIndicator} aria-current="page">{ar
            ? `صفحة ${currentPage.toLocaleString(locale)} من ${pageCount.toLocaleString(locale)}`
            : `Page ${currentPage.toLocaleString(locale)} of ${pageCount.toLocaleString(locale)}`}</span>
          {currentPage < pageCount
            ? <Link className={styles.pageLink} href={studioPageHref(currentPage + 1)}>{ar ? "التالي" : "Next"}</Link>
            : <span className={styles.pageDisabled}>{ar ? "التالي" : "Next"}</span>}
        </nav> : null}
      </>}
    </section>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DiscoverFilters from "@/components/DiscoverFilters";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";
import VideoHoverPreview from "@/components/VideoHoverPreview";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import "./discover-enhancements.module.css";
import "./discover-card-hierarchy.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Video = {
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
type Category = { id: number; name: string; slug: string | null };
type Creator = {
  id: number;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number | null;
};
type EventRow = {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  live_type: string;
  mode: string;
  status: "scheduled" | "live" | "ended" | string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  recording_video_id: number | null;
};
type Community = {
  slug: string;
  type: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  privacy: string;
};
type SearchParams = {
  q?: string | string[];
  category?: string | string[];
  type?: string | string[];
  duration?: string | string[];
  format?: string | string[];
  quality?: string | string[];
  sort?: string | string[];
  page?: string | string[];
};

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hours > 0) return hours + ":" + String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  return mins + ":" + String(secs).padStart(2, "0");
}

function normalizeQuery(value: string | undefined) {
  return (value ?? "")
    .trim()
    .slice(0, 120)
    .replace(/[,()%*\\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const allowedTypes = ["short", "video", "podcast", "documentary", "short_film", "film", "series", "live"] as const;
type AllowedType = (typeof allowedTypes)[number];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function isAllowedType(value: string | undefined): value is AllowedType {
  return Boolean(value && allowedTypes.includes(value as AllowedType));
}

type DiscoverVideoQuery = ReturnType<ReturnType<Awaited<ReturnType<typeof createClient>>["from"]>["select"]>;

function applyDiscoverFilters(request: DiscoverVideoQuery, filters: SearchParams, query: string) {
  let next = request
    .eq("published", true)
    .eq("visibility", "public")
    .eq("search_visible", true);

  if (query) next = next.or("title.ilike.%" + query + "%,description.ilike.%" + query + "%");

  const type = firstParam(filters.type);
  if (isAllowedType(type)) next = next.eq("content_type", type);

  const categoryId = Number(firstParam(filters.category));
  if (Number.isSafeInteger(categoryId) && categoryId > 0) next = next.eq("category_id", categoryId);

  const duration = firstParam(filters.duration);
  if (duration === "under-5") next = next.lt("duration", 5 * 60);
  if (duration === "5-20") next = next.gte("duration", 5 * 60).lt("duration", 20 * 60);
  if (duration === "20-60") next = next.gte("duration", 20 * 60).lt("duration", 60 * 60);
  if (duration === "over-60") next = next.gte("duration", 60 * 60);

  const format = firstParam(filters.format);
  if (format === "16:9" || format === "9:16" || format === "1:1") {
    next = next.eq("aspect_ratio", format);
  }
  if (format === "other") next = next.not("aspect_ratio", "in", "(16:9,9:16,1:1)");

  const quality = firstParam(filters.quality);
  if (["720p", "1080p", "1440p", "2k", "4k", "4K"].includes(quality || "")) {
    next = next.eq("quality", quality === "4K" ? "4k" : quality);
  }

  return next;
}

export default async function DiscoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const [{ locale: rawLocale }, filters] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const isArabic = locale === "ar";
  const supabase = await createClient();
  const query = normalizeQuery(firstParam(filters.q));
  const pageSize = 48;
  const rawPage = Number(firstParam(filters.page));
  const requestedPage = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;

  const countRequest = applyDiscoverFilters(
    supabase.from("videos").select("id", { count: "exact", head: true }),
    filters,
    query,
  );
  const workCountResult = await countRequest;
  const totalWorkCount = workCountResult.count ?? 0;
  const pageCount = Math.max(1, Math.ceil(totalWorkCount / pageSize));
  // Clamp hostile or stale page values before asking PostgREST for a range.
  const currentPage = Math.min(requestedPage, pageCount);

  let orderedRequest = applyDiscoverFilters(
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality,aspect_ratio"),
    filters,
    query,
  );
  const sort = firstParam(filters.sort);
  if (sort === "oldest") {
    orderedRequest = orderedRequest
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
  } else if (sort === "views") {
    orderedRequest = orderedRequest
      .order("views", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  } else if (sort === "likes") {
    orderedRequest = orderedRequest
      .order("likes", { ascending: false, nullsFirst: false })
      .order("id", { ascending: false });
  } else {
    orderedRequest = orderedRequest
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });
  }
  const request = orderedRequest.range((currentPage - 1) * pageSize, currentPage * pageSize - 1);

  const creatorRequest = query
    ? supabase
        .from("creators")
        .select("id,name,username,avatar_url,bio,specialty,followers")
        .or(
          "name.ilike.%" + query + "%,username.ilike.%" + query +
          "%,specialty.ilike.%" + query + "%,bio.ilike.%" + query + "%",
        )
        .order("followers", { ascending: false, nullsFirst: false })
        .limit(12)
    : Promise.resolve({ data: [], error: null });

  const eventRequest = query
    ? supabase
        .from("live_events")
        .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at,recording_video_id")
        .in("status", ["scheduled", "live", "ended"])
        .or("title.ilike.%" + query + "%,description.ilike.%" + query + "%")
        .order("scheduled_at", { ascending: true, nullsFirst: false })
        .limit(12)
    : Promise.resolve({ data: [], error: null });

  const communityRequest = query
    ? supabase
        .from("communities")
        .select("slug,type,name_en,name_ar,description_en,description_ar,privacy")
        .eq("is_active", true)
        .eq("privacy", "public")
        .or(
          "name_en.ilike.%" + query + "%,name_ar.ilike.%" + query +
          "%,description_en.ilike.%" + query + "%,description_ar.ilike.%" + query + "%",
        )
        .order("name_en", { ascending: true })
        .limit(12)
    : Promise.resolve({ data: [], error: null });

  const [workResult, categoriesResult, creatorResult, eventResult, communityResult] = await Promise.all([
    request,
    supabase.from("categories").select("id,name,slug").order("name", { ascending: true }),
    creatorRequest,
    eventRequest,
    communityRequest,
  ]);

  const videos = (workResult.data ?? []) as Video[];
  const normalizedCategories = (categoriesResult.data ?? []) as Category[];
  const creators = (creatorResult.data ?? []) as Creator[];
  const events = (eventResult.data ?? []) as EventRow[];
  const communities = (communityResult.data ?? []) as Community[];
  const hasWorkError = Boolean(workCountResult.error || workResult.error);
  const hasCreatorError = Boolean(creatorResult.error);
  const hasEventError = Boolean(eventResult.error);
  const hasCommunityError = Boolean(communityResult.error);
  const matchingCategories = query
    ? normalizedCategories.filter((category) =>
        (category.name + " " + (category.slug || "")).toLocaleLowerCase(locale).includes(query.toLocaleLowerCase(locale)))
    : [];

  function discoverPageHref(targetPage: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);

    const categoryId = Number(firstParam(filters.category));
    if (Number.isSafeInteger(categoryId) && categoryId > 0) params.set("category", String(categoryId));
    const type = firstParam(filters.type);
    if (isAllowedType(type)) params.set("type", type);

    const duration = firstParam(filters.duration);
    if (["under-5", "5-20", "20-60", "over-60"].includes(duration || "")) params.set("duration", duration!);
    const format = firstParam(filters.format);
    if (["16:9", "9:16", "1:1", "other"].includes(format || "")) params.set("format", format!);
    const quality = firstParam(filters.quality);
    if (["720p", "1080p", "1440p", "2k", "4k", "4K"].includes(quality || "")) {
      params.set("quality", quality!);
    }
    const sort = firstParam(filters.sort);
    if (["oldest", "views", "likes"].includes(sort || "")) params.set("sort", sort!);
    params.set("page", String(targetPage));
    return "/" + locale + "/discover?" + params.toString() + "#discover-results";
  }

  const eventCreatorIds = Array.from(new Set(events.map((event) => Number(event.creator_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const eventRecordingIds = Array.from(new Set(events.map((event) => Number(event.recording_video_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const [{ data: eventCreatorRows }, { data: publicRecordingRows }] = await Promise.all([
    eventCreatorIds.length
      ? supabase.from("creators").select("id,name,username,avatar_url").in("id", eventCreatorIds)
      : Promise.resolve({ data: [] }),
    eventRecordingIds.length
      ? supabase.from("videos").select("id").in("id", eventRecordingIds).eq("published", true).eq("visibility", "public")
      : Promise.resolve({ data: [] }),
  ]);
  const eventCreators = new Map<number, { id: number; name: string | null; username: string | null; avatar_url: string | null }>(
    (eventCreatorRows ?? []).map((creator) => [Number(creator.id), creator as { id: number; name: string | null; username: string | null; avatar_url: string | null }] as const),
  );
  const publicRecordingIds = new Set(((publicRecordingRows ?? []) as Array<{ id: number }>).map((row) => Number(row.id)));
  const eventItems: RAVINEEventItem[] = events.map((event) => {
    const creator = eventCreators.get(Number(event.creator_id));
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.live_type,
      mode: event.mode,
      status: event.status,
      scheduledAt: event.scheduled_at,
      startedAt: event.started_at,
      endedAt: event.ended_at,
      creatorId: creator?.id ?? event.creator_id,
      creatorName: creator?.name || creator?.username || (isArabic ? "مبدع رَافِين" : "RAVINE creator"),
      creatorAvatar: creator?.avatar_url ?? null,
      recordingHref: event.recording_video_id && publicRecordingIds.has(Number(event.recording_video_id))
        ? "/" + locale + "/watch/" + event.recording_video_id
        : null,
      detailHref: "/" + locale + "/events/" + event.id,
    };
  });

  const copy = {
    ar: {
      eyebrow: "رَافِين / اكتشف",
      title: "اكتشف أعمالًا تستحق المشاهدة.",
      intro: "الأعمال أولًا، ثم الأشخاص والسياق والمجتمع الذي يمنحها معناها.",
      workHeading: "الأعمال المطابقة",
      creatorHeading: "المبدعون المطابقون",
      workCount: "عمل",
      creatorCount: "مبدع",
      eventsCount: "حدث",
      communitiesCount: "مجتمع",
      noWork: query ? "لم نعثر على أعمال مطابقة." : "لا توجد أعمال منشورة في هذا القسم بعد.",
      noWorkHelp: query ? "جرّب عبارة مختلفة؛ وقد تجد المبدع الذي تبحث عنه في النتائج التالية." : "ستظهر الأعمال هنا عندما تصبح متاحة للاكتشاف.",
      creatorError: "تعذر تحميل نتائج المبدعين الآن.",
      noCreators: "لم نعثر على مبدعين مطابقين.",
      noCreatorsHelp: "جرّب اسمًا أو تخصصًا أو اسم مستخدم مختلفًا.",
      unknownCreator: "مبدع رَافِين",
      unknownWork: "بدون عنوان",
      workFallback: "عمل إبداعي من مجتمع رَافِين.",
      views: "مشاهدة",
      likes: "إعجاب",
      followers: "متابع",
      creatorLabel: "المبدع",
      categoryHeading: "التصنيفات المطابقة",
      eventHeading: "الأحداث المطابقة",
      communityHeading: "المجتمعات المطابقة",
      categoriesCount: "تصنيف",
      noCommunities: "لم نعثر على مجتمعات عامة مطابقة.",
      eventsError: "تعذر تحميل الأحداث المطابقة الآن.",
      communitiesError: "تعذر تحميل المجتمعات المطابقة الآن.",
      categoryType: "تصنيف",
    },
    en: {
      eyebrow: "RAVINE / DISCOVER",
      title: "Discover work worth watching.",
      intro: "Work first, followed by the people, context, and community that give it meaning.",
      workHeading: "Matching work",
      creatorHeading: "Matching creators",
      workCount: "works",
      creatorCount: "creators",
      eventsCount: "events",
      communitiesCount: "communities",
      noWork: query ? "No matching works found." : "No published work is available in this section yet.",
      noWorkHelp: query ? "Try another phrase; the creator you are looking for may appear in the results below." : "Work will appear here when it is available for discovery.",
      creatorError: "Creator results could not be loaded right now.",
      noCreators: "No matching creators found.",
      noCreatorsHelp: "Try another name, discipline, or username.",
      unknownCreator: "RAVINE creator",
      unknownWork: "Untitled work",
      workFallback: "A creative work from the RAVINE community.",
      views: "views",
      likes: "likes",
      followers: "followers",
      creatorLabel: "CREATOR",
      categoryHeading: "Matching categories",
      eventHeading: "Matching events",
      communityHeading: "Matching communities",
      categoriesCount: "categories",
      noCommunities: "No matching public communities found.",
      eventsError: "Matching events could not be loaded right now.",
      communitiesError: "Matching communities could not be loaded right now.",
      categoryType: "CATEGORY",
    },
  }[locale];

  return (
    <section className="section discover-page" dir={isArabic ? "rtl" : "ltr"}>
      <div className="eyebrow">{copy.eyebrow}</div>
      <h1>{copy.title}</h1>
      <p className="section-note">{copy.intro}</p>

      <DiscoverFilters
        locale={locale}
        query={query}
        category={firstParam(filters.category) ?? ""}
        type={firstParam(filters.type) ?? ""}
        duration={firstParam(filters.duration) ?? ""}
        format={firstParam(filters.format) ?? ""}
        quality={firstParam(filters.quality) ?? ""}
        sort={firstParam(filters.sort) ?? "newest"}
        categories={normalizedCategories}
      />

      <section className="discover-result-section" aria-labelledby="discover-work-heading">
        <div className="section-head">
          <div>
            <div className="eyebrow">{isArabic ? "01 / الأعمال" : "01 / WORK"}</div>
            <h2 id="discover-work-heading">{copy.workHeading}</h2>
          </div>
          <span className="discover-result-count">
            {formatRavineNumber(totalWorkCount, locale)} {copy.workCount}
          </span>
        </div>

        {hasWorkError ? (
          <div className="empty-state" role="alert">
            <strong>{isArabic ? "تعذر تحميل الأعمال." : "We could not load work."}</strong>
            <span>{isArabic ? "تحقق من الاتصال ثم أعد المحاولة." : "Check your connection and try again."}</span>
          </div>
        ) : videos.length ? (
          <div className="video-grid" id="discover-results">
            {videos.map((video) => (
              <Link href={"/" + locale + "/work/" + video.id} className="video-card" key={video.id}>
                <div className="video-thumb">
                  <img src={video.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                  {video.video_url ? <VideoHoverPreview videoUrl={video.video_url} videoId={video.id} /> : null}
                  <span className="duration">{durationLabel(video.duration)}</span>
                </div>
                <div className="video-meta">
                  <div className="video-kicker">
                    <span className="video-type">{video.content_type || "WORK"}</span>
                    {video.quality ? <span className="video-quality">{video.quality}</span> : null}
                  </div>
                  <h2>{video.title || copy.unknownWork}</h2>
                  <p>{video.description || copy.workFallback}</p>
                  <div className="video-stats">
                    <span>{formatRavineNumber(Number(video.views || 0), locale)} {copy.views}</span>
                    <span>{formatRavineNumber(Number(video.likes || 0), locale)} {copy.likes}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <strong>{copy.noWork}</strong>
            <span>{copy.noWorkHelp}</span>
          </div>
        )}

        {!hasWorkError && totalWorkCount > 0 ? (
          <p className="discover-pagination-summary" aria-live="polite">
            {isArabic
              ? `عرض ${formatRavineNumber((currentPage - 1) * pageSize + 1, locale)}–${formatRavineNumber(Math.min(currentPage * pageSize, totalWorkCount), locale)} من ${formatRavineNumber(totalWorkCount, locale)} عمل`
              : `Showing ${formatRavineNumber((currentPage - 1) * pageSize + 1, locale)}–${formatRavineNumber(Math.min(currentPage * pageSize, totalWorkCount), locale)} of ${formatRavineNumber(totalWorkCount, locale)} works`}
          </p>
        ) : null}

        {!hasWorkError && pageCount > 1 ? (
          <nav className="discover-pagination" aria-label={isArabic ? "صفحات الأعمال" : "Work pages"}>
            {currentPage > 1
              ? <Link className="discover-pagination-link" href={discoverPageHref(currentPage - 1)}>{isArabic ? "السابق" : "Previous"}</Link>
              : <span className="discover-pagination-disabled" aria-disabled="true">{isArabic ? "السابق" : "Previous"}</span>}
            <span className="discover-pagination-current" aria-current="page">
              {isArabic
                ? `صفحة ${formatRavineNumber(currentPage, locale)} من ${formatRavineNumber(pageCount, locale)}`
                : `Page ${formatRavineNumber(currentPage, locale)} of ${formatRavineNumber(pageCount, locale)}`}
            </span>
            {currentPage < pageCount
              ? <Link className="discover-pagination-link" href={discoverPageHref(currentPage + 1)}>{isArabic ? "التالي" : "Next"}</Link>
              : <span className="discover-pagination-disabled" aria-disabled="true">{isArabic ? "التالي" : "Next"}</span>}
          </nav>
        ) : null}
      </section>

      {query && matchingCategories.length ? (
        <section className="discover-result-section discover-taxonomy-results" aria-labelledby="discover-category-heading">
          <div className="section-head">
            <div>
              <div className="eyebrow">{isArabic ? "03 / التصنيفات" : "03 / CATEGORIES"}</div>
              <h2 id="discover-category-heading">{copy.categoryHeading}</h2>
            </div>
            <span className="discover-result-count">{formatRavineNumber(matchingCategories.length, locale)} {copy.categoriesCount}</span>
          </div>
          <div className="discover-category-list">
            {matchingCategories.slice(0, 8).map((category) => (
              <Link
                href={"/" + locale + "/discover?category=" + category.id}
                className="discover-category-chip"
                key={category.id}
              >
                <span>{category.name}</span>
                <small>{category.slug || copy.categoryType}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {query ? (
        <section className="discover-result-section discover-event-results" aria-labelledby="discover-event-heading">
          <div className="section-head">
            <div>
              <div className="eyebrow">{isArabic ? "04 / الأحداث" : "04 / EVENTS"}</div>
              <h2 id="discover-event-heading">{copy.eventHeading}</h2>
            </div>
            <span className="discover-result-count">{formatRavineNumber(eventItems.length, locale)} {copy.eventsCount}</span>
          </div>
          {hasEventError ? (
            <div className="empty-state" role="alert">
              <strong>{copy.eventsError}</strong>
              <span>{isArabic ? "يمكنك استكشاف الأعمال والمبدعين في الأقسام الأخرى." : "You can continue with work and creator results."}</span>
            </div>
          ) : (
            <RAVINEEventsCatalog locale={locale} items={eventItems} />
          )}
        </section>
      ) : null}

      {query ? (
        <section className="discover-result-section discover-community-results" aria-labelledby="discover-community-heading">
          <div className="section-head">
            <div>
              <div className="eyebrow">{isArabic ? "05 / المجتمعات" : "05 / COMMUNITIES"}</div>
              <h2 id="discover-community-heading">{copy.communityHeading}</h2>
            </div>
            <span className="discover-result-count">{formatRavineNumber(communities.length, locale)} {copy.communitiesCount}</span>
          </div>
          {hasCommunityError ? (
            <div className="empty-state" role="alert">
              <strong>{copy.communitiesError}</strong>
              <span>{isArabic ? "يمكنك متابعة اكتشاف بقية محتوى رَافِين." : "You can keep exploring the rest of RAVINE."}</span>
            </div>
          ) : communities.length ? (
            <div className="video-grid discover-community-grid">
              {communities.map((community) => (
                <Link href={"/" + locale + "/community/" + community.slug} className="video-card" key={community.slug}>
                  <div className="video-meta">
                    <div className="video-kicker">{community.type.toUpperCase()}</div>
                    <h2>{locale === "ar" ? community.name_ar : community.name_en}</h2>
                    <p>{(locale === "ar" ? community.description_ar : community.description_en) || copy.intro}</p>
                    <div className="video-stats"><span>{isArabic ? "مجتمع عام" : "Public community"}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>{copy.noCommunities}</strong>
              <span>{isArabic ? "جرّب عبارة أخرى أو ابحث عن اسم المبدع." : "Try another phrase or search for a creator name."}</span>
            </div>
          )}
        </section>
      ) : null}

      {query ? (
        <section className="discover-result-section discover-creator-results" aria-labelledby="discover-creator-heading">
          <div className="section-head">
            <div>
              <div className="eyebrow">{isArabic ? "02 / الأشخاص" : "02 / PEOPLE"}</div>
              <h2 id="discover-creator-heading">{copy.creatorHeading}</h2>
            </div>
            <span className="discover-result-count">
              {formatRavineNumber(creators.length, locale)} {copy.creatorCount}
            </span>
          </div>

          {hasCreatorError ? (
            <div className="empty-state" role="alert">
              <strong>{copy.creatorError}</strong>
              <span>{isArabic ? "يمكنك متابعة اكتشاف الأعمال في الأعلى." : "You can continue exploring work above."}</span>
            </div>
          ) : creators.length ? (
            <div className="video-grid creators-grid">
              {creators.map((creator) => (
                <Link href={"/" + locale + "/creators/" + creator.id} className="video-card creator-card" key={creator.id}>
                  <div className="video-thumb creator-avatar-wrap">
                    <img className="creator-avatar" src={creator.avatar_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                  </div>
                  <div className="video-meta">
                    <div className="video-kicker">{creator.specialty || copy.creatorLabel}</div>
                    <h3>{creator.name || creator.username || copy.unknownCreator}</h3>
                    <p>{creator.bio || (isArabic ? "هوية إبداعية من مجتمع رَافِين." : "A creative identity from RAVINE.")}</p>
                    <div className="video-stats">
                      <span>@{creator.username || "creator-" + creator.id}</span>
                      <span>{formatRavineNumber(Number(creator.followers || 0), locale)} {copy.followers}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <strong>{copy.noCreators}</strong>
              <span>{copy.noCreatorsHelp}</span>
            </div>
          )}
        </section>
      ) : null}
    </section>
  );
}

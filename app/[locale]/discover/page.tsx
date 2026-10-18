import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DiscoverFilters from "@/components/DiscoverFilters";
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
type SearchParams = {
  q?: string;
  category?: string;
  type?: string;
  duration?: string;
  format?: string;
  quality?: string;
  sort?: string;
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
    .replace(/[,()%*]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const allowedTypes = ["short", "video", "podcast", "documentary", "short_film", "film", "series", "live"] as const;
type AllowedType = (typeof allowedTypes)[number];

function isAllowedType(value: string | undefined): value is AllowedType {
  return Boolean(value && allowedTypes.includes(value as AllowedType));
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
  const query = normalizeQuery(filters.q);

  let request = supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,views,likes,content_type,quality,aspect_ratio")
    .eq("published", true)
    .eq("visibility", "public")
    .limit(48);

  if (query) request = request.or("title.ilike.%" + query + "%,description.ilike.%" + query + "%");
  if (isAllowedType(filters.type)) request = request.eq("content_type", filters.type);

  const categoryId = Number(filters.category);
  if (Number.isFinite(categoryId) && categoryId > 0) request = request.eq("category_id", categoryId);
  if (filters.duration === "under-5") request = request.lt("duration", 5 * 60);
  if (filters.duration === "5-20") request = request.gte("duration", 5 * 60).lt("duration", 20 * 60);
  if (filters.duration === "20-60") request = request.gte("duration", 20 * 60).lt("duration", 60 * 60);
  if (filters.duration === "over-60") request = request.gte("duration", 60 * 60);
  if (filters.format === "16:9" || filters.format === "9:16" || filters.format === "1:1") {
    request = request.eq("aspect_ratio", filters.format);
  }
  if (filters.format === "other") request = request.not("aspect_ratio", "in", "(16:9,9:16,1:1)");
  if (filters.quality) request = request.eq("quality", filters.quality);
  request = request.order("created_at", { ascending: filters.sort === "oldest" });

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

  const [workResult, categoriesResult, creatorResult] = await Promise.all([
    request,
    supabase.from("categories").select("id,name,slug").order("name", { ascending: true }),
    creatorRequest,
  ]);

  const videos = (workResult.data ?? []) as Video[];
  const normalizedCategories = (categoriesResult.data ?? []) as Category[];
  const creators = (creatorResult.data ?? []) as Creator[];
  const hasWorkError = Boolean(workResult.error);
  const hasCreatorError = Boolean(creatorResult.error);

  const copy = {
    ar: {
      eyebrow: "رَافِين / اكتشف",
      title: "اكتشف أعمالًا تستحق المشاهدة.",
      intro: "الأعمال أولًا، ثم الأشخاص والسياق والمجتمع الذي يمنحها معناها.",
      workHeading: "الأعمال المطابقة",
      creatorHeading: "المبدعون المطابقون",
      workCount: "عمل",
      creatorCount: "مبدع",
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
    },
    en: {
      eyebrow: "RAVINE / DISCOVER",
      title: "Discover work worth watching.",
      intro: "Work first, followed by the people, context, and community that give it meaning.",
      workHeading: "Matching work",
      creatorHeading: "Matching creators",
      workCount: "works",
      creatorCount: "creators",
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
        category={filters.category ?? ""}
        type={filters.type ?? ""}
        duration={filters.duration ?? ""}
        format={filters.format ?? ""}
        quality={filters.quality ?? ""}
        sort={filters.sort ?? "newest"}
        categories={normalizedCategories}
      />

      <section className="discover-result-section" aria-labelledby="discover-work-heading">
        <div className="section-head">
          <div>
            <div className="eyebrow">{isArabic ? "01 / الأعمال" : "01 / WORK"}</div>
            <h2 id="discover-work-heading">{copy.workHeading}</h2>
          </div>
          <span className="discover-result-count">
            {formatRavineNumber(videos.length, locale)} {copy.workCount}
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
      </section>

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

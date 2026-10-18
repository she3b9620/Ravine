import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RAVINEWorkCatalog, { type RAVINECatalogItem } from "@/components/RAVINEWorkCatalog";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type WorkRelation = { video_id: number };
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
  created_at: string | null;
};

function workTypeLabel(type: string | null, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    short: ["شورت", "SHORT"],
    video: ["فيديو", "VIDEO"],
    short_film: ["فيلم قصير", "SHORT FILM"],
    film: ["فيلم مطوّل", "FEATURE FILM"],
    documentary: ["وثائقي", "DOCUMENTARY"],
    podcast: ["بودكاست", "PODCAST"],
    series: ["حلقة مسلسل", "SERIES EPISODE"],
    live: ["بث مباشر", "LIVE"],
  };
  const pair = labels[type || "video"] || labels.video;
  return locale === "ar" ? pair[0] : pair[1];
}

export default async function LibraryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const filters = await searchParams;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const tab = filters.tab === "liked" ? "liked" : "saved";
  const isLiked = tab === "liked";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/" + locale + "/auth?next=" + encodeURIComponent("/" + locale + "/library" + (isLiked ? "?tab=liked" : "")));

  const relationQuery = isLiked
    ? supabase.from("video_likes").select("video_id").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100)
    : supabase.from("video_saves").select("video_id").eq("user_id", auth.user.id).order("created_at", { ascending: false }).limit(100);
  const { data: relationRows, error: relationError } = await relationQuery;
  const ids = Array.from(new Set(
    ((relationRows ?? []) as WorkRelation[])
      .map((row) => Number(row.video_id))
      .filter((id) => Number.isSafeInteger(id) && id > 0),
  ));

  let works: Work[] = [];
  let loadError = Boolean(relationError);
  if (!loadError && ids.length) {
    const { data, error } = await supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at")
      .in("id", ids)
      .eq("published", true)
      .eq("visibility", "public");
    loadError = Boolean(error);
    const byId = new Map<number, Work>((data ?? []).map((work) => [Number(work.id), work as Work]));
    works = ids.map((id) => byId.get(id)).filter((work): work is Work => Boolean(work));
  }

  const items: RAVINECatalogItem[] = works.map((work) => {
    const type = work.content_type || "video";
    return {
      id: work.id,
      href: "/" + locale + "/watch/" + work.id,
      title: work.title || (ar ? "بدون عنوان" : "Untitled"),
      description: work.description,
      imageUrl: work.thumbnail_url,
      duration: work.duration,
      views: work.views,
      likes: work.likes,
      quality: work.quality,
      createdAt: work.created_at,
      badge: workTypeLabel(type, locale),
      kicker: workTypeLabel(type, "en"),
      badgeIcon: type === "podcast" ? "podcast" : type === "film" ? "film" : type === "short_film" ? "short-film" : type === "series" ? "series" : undefined,
      badgeTone: type === "podcast" ? "podcast" : type === "series" ? "series" : undefined,
      primaryMetric: Number(work.views || 0).toLocaleString(locale) + " " + (ar ? "مشاهدة" : "views"),
      secondaryMetric: Number(work.likes || 0).toLocaleString(locale) + " " + (ar ? "إعجاب" : "likes"),
    };
  });

  return (
    <section className="section library-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">RAVINE / {ar ? "المكتبة" : "LIBRARY"}</div>
      <div className="section-head">
        <div>
          <h1>{isLiked ? (ar ? "الأعمال التي أعجبتك." : "Work you liked.") : (ar ? "أعمالك المحفوظة." : "Your saved work.")}</h1>
          <p className="section-note">
            {isLiked
              ? (ar ? "كل عمل عبّرت عن إعجابك به، في مساحة واحدة قابلة للبحث والترتيب." : "Every work you have liked, in one searchable and sortable place.")
              : (ar ? "ارجع إلى الأعمال التي اخترت الاحتفاظ بها، وابحث فيها ورتّبها كما يناسبك." : "Return to work you chose to keep, then search and sort it your way.")}
          </p>
        </div>
        <nav aria-label={ar ? "نوع المكتبة" : "Library view"} className="library-view-tabs">
          <Link className={"button " + (!isLiked ? "primary" : "secondary")} href={"/" + locale + "/library"} aria-current={!isLiked ? "page" : undefined}>
            {ar ? "المحفوظات" : "Saved"}
          </Link>
          <Link className={"button " + (isLiked ? "primary" : "secondary")} href={"/" + locale + "/library?tab=liked"} aria-current={isLiked ? "page" : undefined}>
            {ar ? "أعجبني" : "Liked"}
          </Link>
        </nav>
      </div>
      {loadError ? (
        <div className="empty-state"><strong>{ar ? "تعذر تحميل المكتبة." : "We could not load your library."}</strong><span>{ar ? "تحقق من اتصالك ثم أعد تحميل الصفحة." : "Check your connection and reload the page."}</span></div>
      ) : items.length ? (
        <RAVINEWorkCatalog locale={locale} items={items} />
      ) : (
        <div className="empty-state">
          <strong>{isLiked ? (ar ? "لم تُبدِ إعجابك بأي عمل بعد." : "You have not liked any work yet.") : (ar ? "مكتبتك فارغة." : "Your saved library is empty.")}</strong>
          <span>{isLiked ? (ar ? "عندما تعجبك أعمال من صفحة المشاهدة ستجدها هنا." : "Works you like from their viewing pages will appear here.") : (ar ? "احفظ عملًا من صفحة المشاهدة ليظهر هنا." : "Save work from its viewing page to find it here.")}</span>
          <Link className="button secondary" href={"/" + locale + "/discover"}>{ar ? "اكتشف الأعمال" : "Discover work"}</Link>
        </div>
      )}
    </section>
  );
}

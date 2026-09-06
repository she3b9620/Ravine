import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import DiscoverFilters from "@/components/DiscoverFilters";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Video = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; content_type: string | null; quality: string | null };
type Category = { id: number; name: string; slug: string | null };
type SearchParams = { q?: string; category?: string; type?: string; duration?: string; format?: string; quality?: string; sort?: string };
function durationLabel(seconds: number | null) { if (!seconds || seconds < 1) return "—"; const total = Math.round(seconds); const hours = Math.floor(total / 3600); const mins = Math.floor((total % 3600) / 60); const secs = total % 60; return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${mins}:${String(secs).padStart(2, "0")}`; }
const allowedTypes = ["short", "video", "film", "documentary", "podcast", "live"] as const;
type AllowedType = (typeof allowedTypes)[number];
function isAllowedType(value: string | undefined): value is AllowedType { return Boolean(value && allowedTypes.includes(value as AllowedType)); }

export default async function DiscoverPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<SearchParams> }) {
  const { locale: rawLocale } = await params; const filters = await searchParams; const locale: Locale = rawLocale === "en" ? "en" : "ar"; const isArabic = locale === "ar"; const supabase = await createClient();
  let request = supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,aspect_ratio").eq("published", true).limit(48);
  const query = filters.q?.trim();
  if (query) request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  if (isAllowedType(filters.type)) request = request.eq("content_type", filters.type);
  const categoryId = Number(filters.category); if (Number.isFinite(categoryId) && categoryId > 0) request = request.eq("category_id", categoryId);
  if (filters.duration === "under-5") request = request.lt("duration", 5 * 60); if (filters.duration === "5-20") request = request.gte("duration", 5 * 60).lt("duration", 20 * 60); if (filters.duration === "20-60") request = request.gte("duration", 20 * 60).lt("duration", 60 * 60); if (filters.duration === "over-60") request = request.gte("duration", 60 * 60);
  if (filters.format === "16:9" || filters.format === "9:16" || filters.format === "1:1") request = request.eq("aspect_ratio", filters.format); if (filters.format === "other") request = request.not("aspect_ratio", "in", "(16:9,9:16,1:1)"); if (filters.quality) request = request.eq("quality", filters.quality); request = request.order("created_at", { ascending: filters.sort === "oldest" });
  const [{ data, error }, { data: categories }] = await Promise.all([request, supabase.from("categories").select("id,name,slug").order("name", { ascending: true })]);
  const videos = (data ?? []) as Video[]; const normalizedCategories = (categories ?? []) as Category[];
  return <section className="section discover-page"><div className="eyebrow">{isArabic ? "رَافِين / اكتشف" : "RAVINE / DISCOVER"}</div><h1>{isArabic ? "اكتشف أعمالًا تستحق المشاهدة." : "Discover work worth watching."}</h1><p className="section-note">{isArabic ? "الأعمال أولًا، والسياق والناس خلفها قريبًا." : "Work first, with context and the people behind it close at hand."}</p><DiscoverFilters locale={locale} query={query ?? ""} category={filters.category ?? ""} type={filters.type ?? ""} duration={filters.duration ?? ""} format={filters.format ?? ""} quality={filters.quality ?? ""} sort={filters.sort ?? "newest"} categories={normalizedCategories}/>{error ? <div className="empty-state"><strong>{isArabic ? "تعذر تحميل الأعمال." : "We could not load the work."}</strong><span>{isArabic ? "تعذر تحميل الأعمال في الوقت الحالي. يرجى المحاولة مرة أخرى." : error.message}</span></div> : videos.length === 0 ? <div className="empty-state"><strong>{isArabic ? "لا توجد أعمال مطابقة حاليًا." : "No matching work yet."}</strong><span>{isArabic ? "جرّب بحثًا أو فلترًا مختلفًا." : "Try another search or filter."}</span></div> : <div className="video-grid" id="discover-results">{videos.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.png"} alt="" loading="lazy"/><span className="duration">{durationLabel(video.duration)}</span></div><div className="video-meta"><div className="video-kicker">{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (isArabic ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || (isArabic ? "عمل إبداعي من مجتمع رَافِين." : "A creative work from the RAVINE community.")}</p><div className="video-stats"><span>{formatRavineNumber(Number(video.views || 0), locale)} {isArabic ? "مشاهدة" : "views"}</span><span>{formatRavineNumber(Number(video.likes || 0), locale)} {isArabic ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

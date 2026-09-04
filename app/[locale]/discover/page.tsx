import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Video = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; content_type: string | null; quality: string | null };

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0 ? `${hours}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}` : `${mins}:${String(secs).padStart(2, "0")}`;
}

export default async function DiscoverPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string; category?: string; type?: string }> }) {
  const { locale: rawLocale } = await params;
  const filters = await searchParams;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const isArabic = locale === "ar";
  const supabase = await createClient();
  let request = supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality").eq("published", true).order("created_at", { ascending: false }).limit(48);
  const query = filters.q?.trim();
  if (query) request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  if (filters.type && ["short", "video", "podcast", "live"].includes(filters.type)) request = request.eq("content_type", filters.type);
  const categoryId = Number(filters.category);
  if (Number.isFinite(categoryId) && categoryId > 0) request = request.eq("category_id", categoryId);
  const [{ data, error }, { data: categories }] = await Promise.all([request, supabase.from("categories").select("id,name,slug").order("name", { ascending: true })]);
  const videos = (data ?? []) as Video[];

  return (
    <section className="section discover-page">
      <div className="eyebrow">{isArabic ? "RAVINE / اكتشف" : "RAVINE / DISCOVER"}</div>
      <h1>{isArabic ? "اكتشف أعمالًا تستحق المشاهدة." : "Discover work worth watching."}</h1>
      <p className="section-note">{isArabic ? "الأعمال أولًا، والسياق والناس خلفها قريبًا." : "Work first, with context and the people behind it close at hand."}</p>
      <form className="discover-filters" action={`/${locale}/discover`}>
        <input name="q" defaultValue={query} placeholder={isArabic ? "ابحث عن عمل أو فكرة..." : "Search work or ideas..."} />
        <select name="category" defaultValue={filters.category ?? ""}><option value="">{isArabic ? "كل التصنيفات" : "All categories"}</option>{(categories ?? []).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
        <select name="type" defaultValue={filters.type ?? ""}><option value="">{isArabic ? "كل الأنواع" : "All types"}</option><option value="video">{isArabic ? "فيديو" : "Video"}</option><option value="short">Cuts</option><option value="podcast">Podcast</option><option value="live">Live</option></select>
        <button className="button primary" type="submit">{isArabic ? "بحث" : "Search"}</button>
      </form>
      {error ? <div className="empty-state"><strong>{isArabic ? "تعذر تحميل الأعمال." : "We could not load the work."}</strong><span>{error.message}</span></div> : videos.length === 0 ? <div className="empty-state"><strong>{isArabic ? "لا توجد أعمال مطابقة حاليًا." : "No matching work yet."}</strong><span>{isArabic ? "جرّب بحثًا أو تصنيفًا مختلفًا." : "Try another search or category."}</span></div> : (
        <div className="video-grid">
          {videos.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.png"} alt="" /><span className="duration">{durationLabel(video.duration)}</span></div><div className="video-meta"><div className="video-kicker">{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (isArabic ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || (isArabic ? "عمل إبداعي من مجتمع RAVINE." : "A creative work from the RAVINE community.")}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {isArabic ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {isArabic ? "إعجاب" : "likes"}</span></div></div></Link>)}
        </div>
      )}
    </section>
  );
}

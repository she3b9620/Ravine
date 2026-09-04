import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function SearchPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ q?: string }> }) {
  const { locale: rawLocale } = await params;
  const filters = await searchParams;
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const query = filters.q?.trim() || "";
  const supabase = await createClient();
  let request = supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality").eq("published", true).order("created_at", { ascending: false }).limit(48);
  if (query) request = request.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  const { data, error } = await request;
  return <section className="section"><div className="eyebrow">RAVINE / SEARCH</div><h1>{ar ? "ابحث عن العمل." : "Search the work."}</h1><form className="discover-filters" action={`/${locale}/search`}><input name="q" defaultValue={query} autoFocus placeholder={ar ? "اسم عمل، فكرة، وصف..." : "A title, idea, description..."}/><button className="button primary" type="submit">{ar ? "بحث" : "Search"}</button></form>{error ? <div className="empty-state"><strong>{ar ? "تعذر تنفيذ البحث." : "Search failed."}</strong><span>{error.message}</span></div> : query && !data?.length ? <div className="empty-state"><strong>{ar ? "لا توجد نتائج." : "No results."}</strong><span>{ar ? `لم نجد أعمالًا تطابق «${query}».` : `Nothing matched “${query}”.`}</span></div> : <div className="video-grid">{(data ?? []).map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.png"} alt=""/><span className="duration">{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : "—"}</span></div><div className="video-meta"><div className="video-kicker">{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || ""}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

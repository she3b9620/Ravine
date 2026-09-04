import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality").eq("published", true).eq("content_type", "live").order("created_at", { ascending: false }).limit(24);
  return <section className="section"><div className="eyebrow">RAVINE / LIVE</div><h1>{ar ? "مباشر." : "Live."}</h1><p className="section-note">{ar ? "تجارب حية ومساحات تحدث الآن أو بقيت كأرشيف للمشاهدة." : "Live experiences and conversations, live now or kept as viewing archives."}</p>{error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل البثوث." : "We could not load live sessions."}</strong><span>{error.message}</span></div> : !data?.length ? <div className="empty-state"><strong>{ar ? "لا توجد جلسات Live منشورة بعد." : "No published Live sessions yet."}</strong></div> : <div className="video-grid">{data.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.png"} alt="" /><span className="duration">{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : "LIVE"}</span></div><div className="video-meta"><div className="video-kicker">LIVE{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (ar ? "جلسة مباشرة" : "Live session")}</h2><p>{video.description || ""}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

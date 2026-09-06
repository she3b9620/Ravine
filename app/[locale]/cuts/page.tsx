import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CutsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality").eq("published", true).eq("content_type", "short").order("created_at", { ascending: false }).limit(48);
  return <section className="section"><div className="eyebrow">RAVINE / CUTS</div><h1>{ar ? "كِتس." : "Cuts."}</h1><p className="section-note">{ar ? "لحظات قصيرة، مركزة، ومصممة لتترك أثرًا." : "Short, focused pieces designed to leave an impression."}</p>{error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل الـCuts." : "We could not load Cuts."}</strong><span>{error.message}</span></div> : !data?.length ? <div className="empty-state"><strong>{ar ? "لا توجد Cuts منشورة بعد." : "No published Cuts yet."}</strong></div> : <div className="video-grid">{data.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.PNG"} alt="" /><span className="duration">{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : "—"}</span></div><div className="video-meta"><div className="video-kicker">CUT{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || ""}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

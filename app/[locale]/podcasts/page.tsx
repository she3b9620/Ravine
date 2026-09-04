import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function PodcastsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,quality").eq("published", true).eq("content_type", "podcast").order("created_at", { ascending: false }).limit(48);
  return <section className="section"><div className="eyebrow">RAVINE / PODCASTS</div><h1>{ar ? "البودكاست." : "Podcasts."}</h1><p className="section-note">{ar ? "حوارات وأفكار بصوت أصحابها وسياقها." : "Conversations and ideas, presented in the voice and context of their makers."}</p>{error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل البودكاست." : "We could not load podcasts."}</strong><span>{error.message}</span></div> : !data?.length ? <div className="empty-state"><strong>{ar ? "لا توجد حلقات منشورة بعد." : "No published episodes yet."}</strong></div> : <div className="video-grid">{data.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.png"} alt="" /><span className="duration">{video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, "0")}` : "—"}</span></div><div className="video-meta"><div className="video-kicker">PODCAST{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || ""}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

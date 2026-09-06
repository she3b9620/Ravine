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

export default async function VideosPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase.from("videos").select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality").eq("published", true).eq("content_type", "video").order("created_at", { ascending: false }).limit(48);
  const videos = (data ?? []) as Video[];
  return <section className="section"><div className="eyebrow">RAVINE / {ar ? "فيديو" : "VIDEOS"}</div><h1>{ar ? "أعمال الفيديو." : "Video work."}</h1><p className="section-note">{ar ? "أعمال كاملة بإيقاع وتجربة مشاهدة مقصودة." : "Full-length work built for an intentional viewing experience."}</p>{error ? <div className="empty-state"><strong>{ar ? "تعذر تحميل الفيديوهات." : "We could not load videos."}</strong><span>{error.message}</span></div> : videos.length === 0 ? <div className="empty-state"><strong>{ar ? "لا توجد فيديوهات منشورة بعد." : "No published videos yet."}</strong></div> : <div className="video-grid">{videos.map((video) => <Link href={`/${locale}/watch/${video.id}`} className="video-card" key={video.id}><div className="video-thumb"><img src={video.thumbnail_url || "/RAVINE.PNG"} alt="" /><span className="duration">{durationLabel(video.duration)}</span></div><div className="video-meta"><div className="video-kicker">VIDEO{video.quality ? ` · ${video.quality}` : ""}</div><h2>{video.title || (ar ? "بدون عنوان" : "Untitled")}</h2><p>{video.description || (ar ? "عمل إبداعي من مجتمع RAVINE." : "A creative work from the RAVINE community.")}</p><div className="video-stats"><span>{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div></div></Link>)}</div>}</section>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RAVINEPlayer from "@/components/RAVINEPlayer";
import WatchActions from "@/components/WatchActions";
import styles from "./watch-creator.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null };
type Chapter = { id: number; title: string; start_seconds: number; end_seconds: number | null; thumbnail_url: string | null };
type Asset = { id: number; kind: string; media_url: string; duration: number | null; label: string | null; language: string | null; mime_type: string | null };

function isYouTubeUrl(value: string | null) {
  if (!value) return false;
  try {
    const host = new URL(value).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

export default async function WatchPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId < 1) notFound();

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,views,likes,category,content_type,quality,published,creator_id")
    .eq("id", videoId)
    .eq("published", true)
    .maybeSingle();
  if (error || !video) notFound();

  const [{ data: creator }, { data: chaptersData }, { data: assetsData }] = await Promise.all([
    video.creator_id
      ? supabase.from("creators").select("id,name,username,avatar_url,specialty").eq("id", video.creator_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("work_chapters").select("id,title,start_seconds,end_seconds,thumbnail_url").eq("work_id", videoId).order("sort_order", { ascending: true }),
    supabase.from("work_media_assets").select("id,kind,media_url,duration,label,language,mime_type").eq("work_id", videoId).order("sort_order", { ascending: true }),
  ]);

  let playbackUrl = isYouTubeUrl(video.video_url as string | null) ? null : (video.video_url as string | null);
  if (playbackUrl?.includes("/storage/v1/object/public/")) {
    try {
      const marker = "/storage/v1/object/public/";
      const path = playbackUrl.split(marker)[1] ?? "";
      const [bucket, ...parts] = path.split("/");
      if (bucket && parts.length) {
        const signed = await supabase.storage.from(bucket).createSignedUrl(parts.join("/"), 60 * 60);
        if (!signed.error && signed.data?.signedUrl) playbackUrl = signed.data.signedUrl;
      }
    } catch {
      // Keep non-standard media URLs unchanged.
    }
  }

  const creatorRecord = creator as Creator | null;
  const chapters = (chaptersData ?? []) as Chapter[];
  const assets = (assetsData ?? []) as Asset[];

  return (
    <main className="watch-page" dir={ar ? "rtl" : "ltr"}>
      <div className="watch-frame">
        <RAVINEPlayer src={playbackUrl} poster={video.thumbnail_url} title={video.title || "Untitled"} contentType={video.content_type || "video"} duration={video.duration} locale={locale} chapters={chapters} assets={assets} />
        {isYouTubeUrl(video.video_url as string | null) && (
          <div className="empty-state" style={{ margin: "16px 0" }}>
            <strong>{ar ? "هذا العمل يحتاج نسخة مستقلة داخل RAVINE قبل التشغيل." : "This work needs an independent RAVINE media asset before it can play."}</strong>
            <span>{ar ? "رابط YouTube يُحفظ كمصدر مرجعي فقط ولا يُستخدم كمشغل داخل RAVINE." : "The YouTube URL is retained as a reference source only and is not used as the RAVINE player source."}</span>
          </div>
        )}
        <div className="watch-copy">
          <div className="watch-kicker">{video.content_type || "WORK"}{video.quality ? ` · ${video.quality}` : ""}</div>
          <h1>{video.title || (ar ? "بدون عنوان" : "Untitled")}</h1>
          <p>{video.description || (ar ? "عمل إبداعي من مجتمع RAVINE." : "A creative work from the RAVINE community.")}</p>
          <div className="watch-meta">
            <span className="watch-pill">{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span>
            <span className="watch-pill">{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span>
            {video.category && <span className="watch-pill">{video.category}</span>}
            {video.duration && <span className="watch-pill">{Math.floor(video.duration / 60)}:{String(video.duration % 60).padStart(2, "0")}</span>}
          </div>
          {creatorRecord && (
            <Link className={styles.creator} href={`/${locale}/creators/${creatorRecord.id}`}>
              <img src={creatorRecord.avatar_url || "/RAVINE.png"} alt="" />
              <span>
                <small>{ar ? "المبدع" : "Creator"}</small>
                <strong>{creatorRecord.name || creatorRecord.username || `creator-${creatorRecord.id}`}</strong>
                <em>{creatorRecord.specialty || (ar ? "صانع أعمال إبداعية" : "Creative maker")}</em>
              </span>
            </Link>
          )}
        </div>
        <WatchActions videoId={video.id} duration={video.duration} locale={locale} />
      </div>
    </main>
  );
}

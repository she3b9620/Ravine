import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RAVINEPlayerRuntime from "@/components/RAVINEPlayerRuntime";
import WatchActions from "@/components/WatchActions";
import styles from "./watch-creator.module.css";
import { isYouTubeUrl, resolveAssetPlaybackUrl, resolveWorkPlaybackUrl, type RAVINEPlaybackAsset } from "@/lib/ravine-playback-core";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null };
type Chapter = { id: number; title: string; start_seconds: number; end_seconds: number | null; thumbnail_url: string | null };
type Asset = RAVINEPlaybackAsset;

export default async function WatchPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId < 1) notFound();

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,views,likes,category,content_type,quality,published,visibility,discovery_enabled,creator_id")
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

  const playbackUrl = video.visibility === "public" && video.discovery_enabled !== false
    ? resolveWorkPlaybackUrl(videoId, video.video_url as string | null)
    : null;

  const assets = (assetsData ?? []).flatMap((assetRow) => {
    const asset = assetRow as Asset;
    const mediaUrl = resolveAssetPlaybackUrl(asset);
    return mediaUrl ? [{ ...asset, media_url: mediaUrl }] : [];
  });

  const creatorRecord = creator as Creator | null;
  const chapters = (chaptersData ?? []) as Chapter[];

  return (
    <main className="watch-page" dir={ar ? "rtl" : "ltr"}>
      <div className="watch-frame">
        <RAVINEPlayerRuntime
          src={playbackUrl}
          poster={video.thumbnail_url}
          title={video.title || "Untitled"}
          contentType={video.content_type || "video"}
          duration={video.duration}
          locale={locale}
          chapters={chapters}
          assets={assets}
        />
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
              <img src={creatorRecord.avatar_url || "/RAVINE.PNG"} alt="" />
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

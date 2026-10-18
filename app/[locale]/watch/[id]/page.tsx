import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RAVINEWorkPlayer from "@/components/RAVINEWorkPlayer";
import WatchActions from "@/components/WatchActions";
import RAVINEWorkCatalog, { type RAVINECatalogItem } from "@/components/RAVINEWorkCatalog";
import FollowCreator from "@/components/FollowCreator";
import styles from "./watch-creator.module.css";
import { isYouTubeUrl, resolveAssetPlaybackUrl, type RAVINEPlaybackAsset } from "@/lib/ravine-playback-core";
import { isPlayableRAVINEWork, toRAVINEWork, type RAVINEWorkSource } from "@/lib/ravine-work-universe";
import { canAccessRAVINEVideo } from "@/lib/ravine-video-access";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null; user_id: string | null };
type Chapter = { id: number; title: string; start_seconds: number; end_seconds: number | null; thumbnail_url: string | null };
type Asset = RAVINEPlaybackAsset;
type RelatedVideo = { id: number; title: string | null; description: string | null; thumbnail_url: string | null; duration: number | null; views: number | null; likes: number | null; content_type: string | null; quality: string | null; created_at: string | null };

export default async function WatchPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const videoId = Number(id);
  if (!Number.isInteger(videoId) || videoId < 1) notFound();

  const supabase = await createClient();
  const { data: video, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,views,likes,category,content_type,quality,published,visibility,discovery_enabled,creator_id,user_id")
    .eq("id", videoId)
    .maybeSingle();
  if (error || !video) notFound();
  if (!(await canAccessRAVINEVideo(supabase, video))) notFound();

  const [{ data: creator }, { data: chaptersData }, { data: assetsData }] = await Promise.all([
    video.creator_id
      ? supabase.from("creators").select("id,name,username,avatar_url,specialty,user_id").eq("id", video.creator_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("work_chapters").select("id,title,start_seconds,end_seconds,thumbnail_url").eq("work_id", videoId).order("sort_order", { ascending: true }),
    supabase.from("work_media_assets").select("id,kind,media_url,duration,label,language,mime_type").eq("work_id", videoId).order("sort_order", { ascending: true }),
  ]);

  const [{ data: creatorWorksData }, { data: typeWorksData }] = await Promise.all([
    video.creator_id
      ? supabase.from("videos")
          .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at")
          .eq("creator_id", video.creator_id)
          .eq("published", true)
          .eq("visibility", "public")
          .eq("search_visible", true)
          .neq("id", videoId)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    video.content_type
      ? supabase.from("videos")
          .select("id,title,description,thumbnail_url,duration,views,likes,content_type,quality,created_at")
          .eq("content_type", video.content_type)
          .eq("published", true)
          .eq("visibility", "public")
          .eq("search_visible", true)
          .neq("id", videoId)
          .order("created_at", { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
  ]);
  const relatedById = new Map<number, RelatedVideo>();
  for (const item of [...((creatorWorksData ?? []) as RelatedVideo[]), ...((typeWorksData ?? []) as RelatedVideo[])]) {
    if (Number(item.id) !== videoId && !relatedById.has(Number(item.id))) relatedById.set(Number(item.id), item);
    if (relatedById.size >= 6) break;
  }
  const relatedItems: RAVINECatalogItem[] = Array.from(relatedById.values()).map((item) => ({
    id: item.id,
    href: "/" + locale + "/work/" + item.id,
    title: item.title || (ar ? "عمل بدون عنوان" : "Untitled work"),
    description: item.description || (ar ? "عمل إبداعي من مجتمع رَافِين." : "A creative work from the RAVINE community."),
    imageUrl: item.thumbnail_url,
    duration: item.duration,
    views: item.views,
    likes: item.likes,
    quality: item.quality,
    createdAt: item.created_at,
    badge: item.content_type || (ar ? "عمل" : "WORK"),
    kicker: (item.content_type || "WORK").toUpperCase(),
  }));

  const work = toRAVINEWork(video as RAVINEWorkSource);
  const playbackAllowed = isPlayableRAVINEWork(work);
  const assets = playbackAllowed
    ? (assetsData ?? []).flatMap((assetRow) => {
        const asset = assetRow as Asset;
        const mediaUrl = resolveAssetPlaybackUrl(asset);
        return mediaUrl ? [{ ...asset, media_url: mediaUrl }] : [];
      })
    : [];

  const creatorRecord = creator as Creator | null;
  const chapters = (chaptersData ?? []) as Chapter[];
  const workTypeLabels: Record<typeof work.type, string> = {
    short: ar ? "شورت" : "SHORT",
    short_film: ar ? "فيلم قصير" : "SHORT FILM",
    video: ar ? "فيديو" : "VIDEO",
    podcast: ar ? "بودكاست" : "PODCAST",
    documentary: ar ? "وثائقي" : "DOCUMENTARY",
    film: ar ? "فيلم مطوّل" : "FEATURE FILM",
    series: ar ? "مسلسل / حلقة" : "SERIES EPISODE",
    live: ar ? "بث مباشر" : "LIVE",
  };

  return (
    <main className="watch-page" dir={ar ? "rtl" : "ltr"}>
      <div className="watch-frame">
        <RAVINEWorkPlayer work={work} locale={locale} chapters={chapters} assets={assets} />
        {isYouTubeUrl(video.video_url as string | null) && (
          <div className="empty-state" style={{ margin: "16px 0" }}>
            <strong>{ar ? "هذا العمل يحتاج نسخة مستقلة داخل RAVINE قبل التشغيل." : "This work needs an independent RAVINE media asset before it can play."}</strong>
            <span>{ar ? "رابط YouTube يُحفظ كمصدر مرجعي فقط ولا يُستخدم كمشغل داخل RAVINE." : "The YouTube URL is retained as a reference source only and is not used as the RAVINE player source."}</span>
          </div>
        )}
        {!playbackAllowed && !isYouTubeUrl(video.video_url as string | null) && (
          <div className="empty-state" style={{ margin: "16px 0" }}>
            <strong>{ar ? "هذا العمل غير متاح للتشغيل حاليًا." : "This work is not available for playback yet."}</strong>
            <span>{ar ? "سيظهر العمل عندما تصبح سياسة الوصول ومصدر التشغيل صالحين." : "The work will become playable when its access policy and playback source are valid."}</span>
          </div>
        )}
        <div className="watch-copy">
          <div className="watch-kicker">{workTypeLabels[work.type]}{video.quality ? ` · ${video.quality}` : ""}</div>
          <h1>{work.title}</h1>
          <p>{work.description || (ar ? "عمل إبداعي من مجتمع RAVINE." : "A creative work from the RAVINE community.")}</p>
          <div className="watch-meta">
            <span className="watch-pill">{Number(video.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span>
            <span className="watch-pill">{Number(video.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span>
            {video.category && <span className="watch-pill">{video.category}</span>}
            {work.duration && <span className="watch-pill">{Math.floor(work.duration / 60)}:{String(work.duration % 60).padStart(2, "0")}</span>}
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
          {creatorRecord && video.published ? (
            <FollowCreator creatorId={creatorRecord.id} creatorUserId={creatorRecord.user_id} locale={locale} returnPath={"/" + locale + "/watch/" + videoId} />
          ) : null}
        </div>
        {video.published ? <WatchActions videoId={video.id} duration={video.duration} locale={locale} /> : null}
      </div>
      {relatedItems.length ? (
        <section className="section ravine-related-work" aria-labelledby="ravine-watch-related-heading">
          <div className="section-head">
            <div>
              <div className="eyebrow">RAVINE / MORE TO EXPLORE</div>
              <h2 id="ravine-watch-related-heading">{ar ? "واصل رحلتك مع أعمال قريبة." : "Continue with related work."}</h2>
              <p className="section-note">{ar ? "أعمال عامة أخرى من المبدع نفسه أو من النوع نفسه، مع احترام إعدادات ظهورها." : "Other public work by this creator or in the same format, respecting each work’s visibility settings."}</p>
            </div>
          </div>
          <RAVINEWorkCatalog locale={locale} items={relatedItems} />
        </section>
      ) : null}
    </main>
  );
}

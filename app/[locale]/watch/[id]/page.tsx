import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import WatchActions from "@/components/WatchActions";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";

type Creator = {
  id: number;
  name: string | null;
  username: string | null;
  avatar_url: string | null;
  specialty: string | null;
};

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

  const { data: creator } = video.creator_id
    ? await supabase.from("creators").select("id,name,username,avatar_url,specialty").eq("id", video.creator_id).maybeSingle()
    : { data: null };

  let playbackUrl = video.video_url as string | null;
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

  return (
    <main className="watch-page" dir={ar ? "rtl" : "ltr"}>
      <div className="watch-frame">
        {playbackUrl ? (
          <video className="watch-video" controls playsInline preload="metadata" poster={video.thumbnail_url || undefined} src={playbackUrl}>
            {ar ? "متصفحك لا يدعم تشغيل الفيديو." : "Your browser does not support video playback."}
          </video>
        ) : (
          <div className="empty-state" style={{ minHeight: "60vh", justifyContent: "center", alignItems: "center" }}><strong>{ar ? "العمل غير متاح للتشغيل حاليًا." : "This work is not available for playback yet."}</strong></div>
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
            <Link className="watch-creator" href={`/${locale}/creators/${creatorRecord.id}`}>
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

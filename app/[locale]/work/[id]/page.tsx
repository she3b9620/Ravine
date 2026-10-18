import Link from "next/link";
import { notFound } from "next/navigation";
import RAVINEWorkContext from "@/components/RAVINEWorkContext";
import RAVINEWorkPlayer from "@/components/RAVINEWorkPlayer";
import WatchActions from "@/components/WatchActions";
import FollowCreator from "@/components/FollowCreator";
import { createClient } from "@/lib/supabase/server";
import type { RAVINEPlaybackAsset } from "@/lib/ravine-playback-core";
import { isPlayableRAVINEWork, toRAVINEWork, type RAVINEWorkSource } from "@/lib/ravine-work-universe";
import { canAccessRAVINEVideo } from "@/lib/ravine-video-access";
import styles from "./work-creator-actions.module.css";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type WorkRow = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  published: boolean | null;
  visibility: string | null;
  discovery_enabled: boolean | null;
  content_type: string | null;
  creator_id: number | null;
  user_id: string | null;
};
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null; specialty: string | null; user_id: string | null };
type Chapter = {
  id: number;
  title: string;
  start_seconds: number;
  end_seconds: number | null;
  thumbnail_url: string | null;
};

export default async function WorkPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const workId = Number(id);
  if (!Number.isInteger(workId) || workId <= 0) notFound();

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("videos")
    .select("id,title,description,thumbnail_url,video_url,duration,published,visibility,discovery_enabled,content_type,creator_id,user_id")
    .eq("id", workId)
    .maybeSingle();

  if (error) {
    return (
      <section className="section">
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل العمل." : "We could not load this work."}</strong>
          <span>{error.message}</span>
          <Link className="button" href={`/${locale}/discover`}>{ar ? "العودة إلى اكتشف" : "Back to Discover"}</Link>
        </div>
      </section>
    );
  }

  if (!data) notFound();
  if (!(await canAccessRAVINEVideo(supabase, data))) notFound();

  const [{ data: creatorData }, { data: chapterData }, { data: assetData }] = await Promise.all([
    data.creator_id
      ? supabase.from("creators").select("id,name,username,avatar_url,specialty,user_id").eq("id", data.creator_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("work_chapters").select("id,title,start_seconds,end_seconds,thumbnail_url,sort_order").eq("work_id", workId).order("sort_order", { ascending: true }),
    supabase.from("work_media_assets").select("id,kind,media_url,public_id,duration,language,label,mime_type,sort_order,metadata").eq("work_id", workId).order("sort_order", { ascending: true }),
  ]);
  const creator = creatorData as Creator | null;

  const work = toRAVINEWork(data as WorkRow & RAVINEWorkSource);
  const playable = isPlayableRAVINEWork(work);
  const chapters = (chapterData ?? []) as Chapter[];
  const assets = (assetData ?? []) as unknown as RAVINEPlaybackAsset[];

  return (
    <section className="section ravine-work-page">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / WORK UNIVERSE</div>
          <p className="section-note">
            {ar ? "العمل هو نقطة الدخول، ثم السياق والناس والمجتمع من حوله." : "The work is the entry point; its context, people, and community grow around it."}
          </p>
        </div>
      </div>

      <RAVINEWorkPlayer work={work} locale={locale} chapters={chapters} assets={assets} />
      <RAVINEWorkContext work={work} locale={locale} playable={playable} />
      {creator ? (
        <section className={styles.creatorSection} aria-label={ar ? "المبدع صاحب العمل" : "Work creator"}>
          <div className={styles.creatorEyebrow}>RAVINE / {ar ? "المبدع" : "CREATOR"}</div>
          <div className={styles.creatorRow}>
            <Link className={styles.creatorIdentity} href={"/" + locale + "/creators/" + creator.id}>
              <span className={styles.avatar}>{creator.avatar_url ? <img src={creator.avatar_url} alt="" /> : <span>{(creator.name || creator.username || "R").slice(0, 1)}</span>}</span>
              <span className={styles.creatorCopy}>
                <strong>{creator.name || creator.username || (ar ? "مبدع رَافِين" : "RAVINE creator")}</strong>
                <small>{creator.specialty || (ar ? "صانع أعمال إبداعية" : "Creative maker")}</small>
              </span>
            </Link>
            {data.published ? (
              <FollowCreator
                creatorId={creator.id}
                creatorUserId={creator.user_id}
                locale={locale}
                returnPath={"/" + locale + "/work/" + workId}
              />
            ) : null}
          </div>
        </section>
      ) : null}
      {data.published ? <WatchActions videoId={workId} duration={data.duration} locale={locale} returnPath={"/" + locale + "/work/" + workId} showCinemaMode={false} /> : null}

      {!playable && work.mediaUrl && work.mediaUrl.includes("youtube.com") ? (
        <div className="empty-state">
          <strong>{ar ? "هذا المصدر مرجعي فقط." : "This source is reference-only."}</strong>
          <span>{ar ? "يحتاج العمل إلى ملف تشغيل متوافق مع مشغل RAVINE." : "This work needs a browser-compatible media source for the RAVINE player."}</span>
        </div>
      ) : null}
    </section>
  );
}

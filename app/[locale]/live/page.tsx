import Link from "next/link";
import { Radio } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";
import RAVINEWorkCatalog, { type RAVINECatalogItem } from "@/components/RAVINEWorkCatalog";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type LiveEvent = {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  live_type: string;
  mode: string;
  status: "scheduled" | "live" | "ended" | string;
  scheduled_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  recording_video_id: number | null;
};
type Creator = { id: number; name: string | null; username: string | null; avatar_url: string | null };
type Recording = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  created_at: string | null;
  creator_id: number | null;
  content_type: string | null;
};
type RecordingCreator = { id: number; name: string | null; username: string | null };

export default async function LivePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const [{ data: eventRows, error: eventsError }, { data: recordingRows, error: recordingsError }] = await Promise.all([
    supabase
      .from("live_events")
      .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at,recording_video_id")
      .in("status", ["scheduled", "live", "ended"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(100),
    supabase
      .from("videos")
      .select("id,title,description,thumbnail_url,duration,views,likes,quality,created_at,creator_id,content_type")
      .eq("published", true)
      .eq("visibility", "public")
      .eq("content_type", "live")
      .order("created_at", { ascending: false })
      .limit(48),
  ]);

  const events = (eventRows ?? []) as LiveEvent[];
  const recordings = (recordingRows ?? []) as Recording[];
  const creatorIds = Array.from(new Set([
    ...events.map((event) => Number(event.creator_id)),
    ...recordings.map((work) => Number(work.creator_id)),
  ].filter((id) => Number.isSafeInteger(id) && id > 0)));
  const recordingIds = Array.from(new Set(
    events.map((event) => Number(event.recording_video_id)).filter((id) => Number.isSafeInteger(id) && id > 0),
  ));

  const [{ data: creatorRows }, { data: publicEventRecordings }] = await Promise.all([
    creatorIds.length
      ? supabase.from("creators").select("id,name,username,avatar_url").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    recordingIds.length
      ? supabase.from("videos").select("id").in("id", recordingIds).eq("published", true).eq("visibility", "public")
      : Promise.resolve({ data: [] }),
  ]);

  const creators = new Map<number, Creator>(
    (creatorRows ?? []).map((creator) => [Number(creator.id), creator as Creator] as const),
  );
  const publicRecordingIds = new Set(
    ((publicEventRecordings ?? []) as Array<{ id: number }>).map((row) => Number(row.id)),
  );

  const eventItems: RAVINEEventItem[] = events.map((event) => {
    const creator = creators.get(Number(event.creator_id));
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      type: event.live_type,
      mode: event.mode,
      status: event.status,
      scheduledAt: event.scheduled_at,
      startedAt: event.started_at,
      endedAt: event.ended_at,
      creatorId: creator?.id ?? event.creator_id,
      creatorName: creator?.name || creator?.username || (ar ? "مبدع رَافِين" : "RAVINE creator"),
      creatorAvatar: creator?.avatar_url ?? null,
      recordingHref: event.recording_video_id && publicRecordingIds.has(Number(event.recording_video_id))
        ? "/" + locale + "/watch/" + event.recording_video_id
        : null,
      detailHref: "/" + locale + "/events/" + event.id,
    };
  });

  const archiveItems: RAVINECatalogItem[] = recordings.map((work) => {
    const creator = work.creator_id ? creators.get(Number(work.creator_id)) as RecordingCreator | undefined : undefined;
    return {
      id: work.id,
      href: "/" + locale + "/watch/" + work.id,
      title: work.title || (ar ? "جلسة مباشرة" : "Live session"),
      description: work.description,
      imageUrl: work.thumbnail_url,
      duration: work.duration,
      views: work.views,
      likes: work.likes,
      quality: work.quality,
      createdAt: work.created_at,
      badge: ar ? "تسجيل بث" : "LIVE RECORDING",
      kicker: ar ? "LIVE / أرشيف" : "LIVE / ARCHIVE",
      primaryMetric: Number(work.views || 0).toLocaleString(locale) + " " + (ar ? "مشاهدة" : "views"),
      secondaryMetric: creator
        ? (ar ? "بواسطة " : "By ") + (creator.name || creator.username || "RAVINE creator")
        : Number(work.likes || 0).toLocaleString(locale) + " " + (ar ? "إعجاب" : "likes"),
    };
  });

  return (
    <section className="section ravine-live-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">{ar ? "رَافِين / مباشر" : "RAVINE / LIVE"}</div>
      <div className="ravine-events-heading">
        <div>
          <h1>{ar ? "المباشر، من موعده إلى أرشيفه." : "Live, from the schedule to the archive."}</h1>
          <p className="section-note">
            {ar
              ? "تابع الجلسات المجدولة والمباشرة، ثم اكتشف التسجيلات العامة بعد نشرها. أدوات المشاركة الحية تعتمد على استكمال مزود البث وسياساته."
              : "Browse scheduled and live sessions, then revisit public recordings after publication. Live participation depends on completion of the selected provider and its policies."}
          </p>
        </div>
        <div className="ravine-events-heading-mark" aria-hidden="true"><Radio size={30} strokeWidth={1.4} /></div>
      </div>

      <section className="ravine-live-schedule">
        <div className="section-head">
          <div>
            <div className="eyebrow">{ar ? "RAVINE / جدول البث" : "RAVINE / LIVE SCHEDULE"}</div>
            <h2>{ar ? "الجلسات والمواعيد." : "Sessions & schedules."}</h2>
          </div>
          <Link className="button secondary" href={"/" + locale + "/events"}>{ar ? "كل الأحداث" : "All events"}</Link>
        </div>
        {eventsError ? (
          <div className="empty-state">
            <strong>{ar ? "تعذر تحميل جدول البث." : "The live schedule is unavailable."}</strong>
            <span>{ar ? "يمكنك متابعة التسجيلات العامة بالأسفل." : "You can still browse public recordings below."}</span>
          </div>
        ) : <RAVINEEventsCatalog locale={locale} items={eventItems} />}
      </section>

      <section className="ravine-live-archive">
        <div className="section-head">
          <div>
            <div className="eyebrow">{ar ? "RAVINE / الأرشيف" : "RAVINE / ARCHIVE"}</div>
            <h2>{ar ? "جلسات تستحق العودة إليها." : "Sessions worth returning to."}</h2>
            <p className="section-note">{ar ? "التسجيلات هنا أعمال منشورة ومتاحة للعامة فقط." : "Only published, public recordings appear here."}</p>
          </div>
        </div>
        {recordingsError ? (
          <div className="empty-state">
            <strong>{ar ? "تعذر تحميل الأرشيف." : "The recording archive is unavailable."}</strong>
            <span>{ar ? "حاول مرة أخرى لاحقًا." : "Please try again later."}</span>
          </div>
        ) : archiveItems.length ? (
          <RAVINEWorkCatalog locale={locale} items={archiveItems} />
        ) : (
          <div className="empty-state">
            <strong>{ar ? "لا توجد تسجيلات عامة بعد." : "No public recordings yet."}</strong>
            <span>{ar ? "ستظهر التسجيلات هنا بعد نشرها ضمن أعمال رَافِين." : "Recordings will appear here after they are published as RAVINE work."}</span>
          </div>
        )}
      </section>
    </section>
  );
}

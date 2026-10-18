import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";

export const dynamic = "force-dynamic";

type Locale = "ar" | "en";
type EventRow = {
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
  created_at: string;
};
type CreatorRow = { id: number; name: string | null; username: string | null; avatar_url: string | null };
type PublicRecording = { id: number };

export default async function EventsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("live_events")
    .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at,recording_video_id,created_at")
    .in("status", ["scheduled", "live", "ended"])
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .limit(100);

  const events = (data ?? []) as EventRow[];
  if (error) {
    return (
      <section className="section ravine-events-page">
        <div className="eyebrow">RAVINE / EVENTS & PREMIERES</div>
        <h1>{ar ? "الأحداث والعروض." : "Events & premieres."}</h1>
        <p className="section-note">{ar ? "مواعيد العروض والجلسات واللقاءات المرتبطة بالأعمال والمبدعين." : "Schedules for premieres, live sessions, and gatherings around creative work."}</p>
        <div className="empty-state">
          <strong>{ar ? "تعذر تحميل جدول الأحداث." : "The event schedule is unavailable."}</strong>
          <span>{ar ? "يمكنك تجربة صفحة الاكتشاف بينما يُستعاد جدول الأحداث." : "Explore published work while the event schedule is unavailable."}</span>
          <Link className="button secondary" href={"/" + locale + "/discover"}>{ar ? "اكتشف الأعمال" : "Discover work"}</Link>
        </div>
      </section>
    );
  }

  const creatorIds = Array.from(new Set(events.map((event) => Number(event.creator_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const recordingIds = Array.from(new Set(events.map((event) => Number(event.recording_video_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));
  const [{ data: creatorRows }, { data: recordingRows }] = await Promise.all([
    creatorIds.length
      ? supabase.from("creators").select("id,name,username,avatar_url").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    recordingIds.length
      ? supabase.from("videos").select("id").in("id", recordingIds).eq("published", true).eq("visibility", "public")
      : Promise.resolve({ data: [] }),
  ]);

  const creatorsById = new Map<number, CreatorRow>((creatorRows ?? []).map((creator) => [Number(creator.id), creator as CreatorRow] as const));
  const publicRecordings = new Set(((recordingRows ?? []) as PublicRecording[]).map((recording) => Number(recording.id)));
  const items: RAVINEEventItem[] = events.map((event) => {
    const creator = creatorsById.get(Number(event.creator_id));
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
      recordingHref: event.recording_video_id && publicRecordings.has(Number(event.recording_video_id))
        ? "/" + locale + "/watch/" + event.recording_video_id
        : null,
    };
  });

  return (
    <section className="section ravine-events-page" dir={ar ? "rtl" : "ltr"}>
      <div className="eyebrow">{ar ? "رَافِين / الأحداث والعروض" : "RAVINE / EVENTS & PREMIERES"}</div>
      <div className="ravine-events-heading">
        <div>
          <h1>{ar ? "اللحظات التي تستحق موعدًا." : "Moments worth showing up for."}</h1>
          <p className="section-note">{ar ? "اكتشف مواعيد العروض والجلسات واللقاءات، ثم ارجع إلى العمل عندما يصبح التسجيل متاحًا." : "Find premiere times, live sessions, and gatherings—then return to the work when a public recording is available."}</p>
        </div>
        <div className="ravine-events-heading-mark" aria-hidden="true"><CalendarClock size={30} strokeWidth={1.4} /></div>
      </div>
      <RAVINEEventsCatalog locale={locale} items={items} />
    </section>
  );
}

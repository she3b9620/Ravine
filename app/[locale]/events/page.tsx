import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import RAVINEEventsCatalog, { type RAVINEEventItem } from "@/components/RAVINEEventsCatalog";
import RAVINEEventManagement, { type RAVINEManagedEvent } from "@/components/RAVINEEventManagement";
import type { RAVINEEventHostOption } from "@/components/RAVINEEventCreateForm";
import styles from "./events-management.module.css";

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

export default async function EventsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const [{ locale: rawLocale }, query] = await Promise.all([params, searchParams]);
  const locale: Locale = rawLocale === "en" ? "en" : "ar";
  const ar = locale === "ar";
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  const [{ data: eventRows, error: eventsError }, { data: ownedCreatorRows }] = await Promise.all([
    supabase
      .from("live_events")
      .select("id,creator_id,title,description,live_type,mode,status,scheduled_at,started_at,ended_at,recording_video_id,created_at")
      .in("status", ["scheduled", "live", "ended"])
      .order("scheduled_at", { ascending: true, nullsFirst: false })
      .limit(100),
    auth.user
      ? supabase.from("creators").select("id,name,username").eq("user_id", auth.user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const events = (eventRows ?? []) as EventRow[];
  const ownedCreators = (ownedCreatorRows ?? []) as Array<{ id: number; name: string | null; username: string | null }>;
  const ownedCreatorIds = ownedCreators.map((creator) => Number(creator.id)).filter((id) => Number.isSafeInteger(id) && id > 0);
  const creatorIds = Array.from(new Set([
    ...events.map((event) => Number(event.creator_id)),
    ...ownedCreatorIds,
  ].filter((id) => Number.isSafeInteger(id) && id > 0)));
  const recordingIds = Array.from(new Set(events.map((event) => Number(event.recording_video_id)).filter((id) => Number.isSafeInteger(id) && id > 0)));

  const [{ data: creatorRows }, { data: recordingRows }, { data: managedRows, error: managedError }] = await Promise.all([
    creatorIds.length
      ? supabase.from("creators").select("id,name,username,avatar_url").in("id", creatorIds)
      : Promise.resolve({ data: [] }),
    recordingIds.length
      ? supabase.from("videos").select("id").in("id", recordingIds).eq("published", true).eq("visibility", "public")
      : Promise.resolve({ data: [] }),
    ownedCreatorIds.length
      ? supabase.from("live_events").select("id,creator_id,title,description,live_type,mode,status,scheduled_at,created_at").in("creator_id", ownedCreatorIds).order("created_at", { ascending: false }).limit(40)
      : Promise.resolve({ data: [], error: null }),
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

  const managedEvents = (managedRows ?? []) as RAVINEManagedEvent[];
  const hosts: RAVINEEventHostOption[] = ownedCreators.map((creator) => ({
    id: Number(creator.id),
    label: creator.name || creator.username || (ar ? "مبدع رَافِين #" : "RAVINE creator #") + creator.id,
  }));

  const errorCopy: Record<string, [string, string]> = {
    input: ["راجع بيانات الحدث وحاول مرة أخرى.", "Review the event details and try again."],
    time: ["صيغة الموعد غير صحيحة.", "The event date is invalid."],
    past: ["اختر موعدًا في المستقبل.", "Choose a future date and time."],
    permission: ["لا تملك صلاحية إدارة هذه الهوية أو الحدث.", "You do not have permission to manage this identity or event."],
    status: ["لا يمكن إلغاء هذا الحدث في حالته الحالية.", "This event cannot be cancelled in its current state."],
    create: ["تعذر إنشاء الموعد. تأكد من توافر صلاحيات الأحداث في قاعدة البيانات.", "Could not create the schedule. Check the event access policies."],
  };
  const noticeCopy: Record<string, [string, string]> = {
    created: ["تم نشر الموعد.", "Schedule published."],
    cancelled: ["تم إلغاء الموعد.", "The scheduled event was cancelled."],
  };
  const errorMessage = query.error && errorCopy[query.error] ? errorCopy[query.error][ar ? 0 : 1] : "";
  const noticeMessage = query.notice && noticeCopy[query.notice] ? noticeCopy[query.notice][ar ? 0 : 1] : "";

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

      {eventsError ? <div className={styles.error} role="alert"><strong>{ar ? "تعذر تحميل جدول الأحداث." : "The event schedule is unavailable."}</strong><span>{ar ? "قد تحتاج صلاحيات قاعدة البيانات إلى التحديث. يمكنك استكشاف الأعمال المنشورة." : "Event access policies may need an update. You can still explore published work."}</span><Link className="button secondary" href={"/" + locale + "/discover"}>{ar ? "اكتشف الأعمال" : "Discover work"}</Link></div> : <RAVINEEventsCatalog locale={locale} items={items} />}

      {hosts.length ? (
        <RAVINEEventManagement locale={locale} creators={hosts} events={managedEvents} errorMessage={errorMessage || (managedError ? (ar ? "تعذر تحميل مواعيدك." : "Could not load your scheduled events.") : "")} noticeMessage={noticeMessage} />
      ) : null}
    </section>
  );
}

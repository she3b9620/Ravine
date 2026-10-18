import { CalendarClock, CircleX } from "lucide-react";
import { cancelRAVINELiveEventAction } from "@/app/actions/ravine-live-events";
import RAVINEEventCreateForm, { type RAVINEEventHostOption } from "@/components/RAVINEEventCreateForm";
import styles from "./RAVINEEventManagement.module.css";

type Locale = "ar" | "en";
type ManagedEvent = {
  id: number;
  creator_id: number;
  title: string;
  description: string | null;
  live_type: string;
  mode: string;
  status: string;
  scheduled_at: string | null;
  created_at: string;
};
type Props = {
  locale: Locale;
  creators: RAVINEEventHostOption[];
  events: ManagedEvent[];
  errorMessage?: string;
  noticeMessage?: string;
};

function formatDate(value: string | null, locale: Locale) {
  if (!value) return locale === "ar" ? "الموعد لم يُحدد" : "Time to be announced";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return locale === "ar" ? "الموعد لم يُحدد" : "Time to be announced";
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function RAVINEEventManagement({ locale, creators, events, errorMessage = "", noticeMessage = "" }: Props) {
  const ar = locale === "ar";
  const statusLabel = (status: string) => {
    const labels: Record<string, [string, string]> = {
      scheduled: ["مجدول", "Scheduled"],
      live: ["مباشر", "Live"],
      ended: ["انتهى", "Ended"],
      cancelled: ["ملغي", "Cancelled"],
    };
    const pair = labels[status] || [status, status];
    return ar ? pair[0] : pair[1];
  };

  return (
    <section className={styles.management} dir={ar ? "rtl" : "ltr"}>
      {creators.length ? <RAVINEEventCreateForm locale={locale} creators={creators} /> : null}
      {errorMessage ? <div className={styles.error} role="alert">{errorMessage}</div> : null}
      {noticeMessage ? <p className={styles.notice} role="status">{noticeMessage}</p> : null}
      {creators.length ? (
        <div className={styles.managedList}>
          <div className={styles.managedHeading}>
            <div>
              <div className="eyebrow">{ar ? "RAVINE / مساحة المبدع" : "RAVINE / CREATOR EVENTS"}</div>
              <h2>{ar ? "مواعيدك المنشورة." : "Your scheduled events."}</h2>
            </div>
            <span>{events.length.toLocaleString(locale)}</span>
          </div>
          {events.length ? events.map((event) => (
            <article className={styles.managedCard} key={event.id}>
              <div className={styles.managedInfo}>
                <span className={styles.managedStatus} data-status={event.status}>{statusLabel(event.status)}</span>
                <h3>{event.title}</h3>
                {event.description ? <p>{event.description}</p> : null}
                <div className={styles.managedMeta}><CalendarClock size={14} aria-hidden="true" />{formatDate(event.scheduled_at, locale)}<span>{event.mode === "audio" ? (ar ? "صوت" : "Audio") : event.mode === "hybrid" ? (ar ? "صوت وفيديو" : "Audio + video") : (ar ? "فيديو" : "Video")}</span></div>
              </div>
              {event.status === "scheduled" ? (
                <form action={cancelRAVINELiveEventAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="event_id" value={event.id} />
                  <button className={styles.cancelButton} type="submit"><CircleX size={14} />{ar ? "إلغاء الموعد" : "Cancel schedule"}</button>
                </form>
              ) : null}
            </article>
          )) : <div className={styles.empty}>{ar ? "لا توجد مواعيد حتى الآن." : "You have no scheduled events yet."}</div>}
        </div>
      ) : null}
    </section>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, Clock3, Radio, Search, Tv, X } from "lucide-react";
import styles from "./RAVINEEventsCatalog.module.css";

export type RAVINEEventItem = {
  id: number | string;
  title: string;
  description: string | null;
  type: string;
  mode: string;
  status: string;
  scheduledAt: string | null;
  startedAt: string | null;
  endedAt: string | null;
  creatorId: number | null;
  creatorName: string;
  creatorAvatar: string | null;
  recordingHref: string | null;
};

type Locale = "ar" | "en";
type Filter = "all" | "upcoming" | "live" | "ended";

const copy = {
  ar: {
    search: "ابحث في الأحداث...", all: "الكل", upcoming: "قادمة", live: "مباشر الآن", ended: "انتهت",
    scheduled: "مجدول", liveStatus: "مباشر", endedStatus: "انتهى", timeTba: "الموعد لم يُحدد",
    host: "المبدع", recording: "مشاهدة التسجيل", noRecording: "لا يوجد تسجيل عام بعد",
    noResults: "لا توجد أحداث مطابقة.", noResultsHelp: "جرّب كلمة أخرى أو اختر عرض جميع الأحداث.",
    clear: "عرض الكل", modeVideo: "فيديو", modeAudio: "صوت", modeHybrid: "صوت وفيديو",
  },
  en: {
    search: "Search events...", all: "All", upcoming: "Upcoming", live: "Live now", ended: "Ended",
    scheduled: "Scheduled", liveStatus: "Live", endedStatus: "Ended", timeTba: "Time to be announced",
    host: "Creator", recording: "Watch recording", noRecording: "No public recording yet",
    noResults: "No matching events.", noResultsHelp: "Try another term or show all events.",
    clear: "Show all", modeVideo: "Video", modeAudio: "Audio", modeHybrid: "Audio + video",
  },
} as const;

function formatEventType(type: string, locale: Locale) {
  const labels: Record<string, [string, string]> = {
    solo: ["جلسة فردية", "Solo session"], co_live: ["بث مشترك", "Co-live"],
    open: ["جلسة مفتوحة", "Open session"], debate: ["مناظرة", "Debate"], interview: ["مقابلة", "Interview"], town_hall: ["لقاء عام", "Town hall"],
    guest: ["ضيف", "Guest"], panel: ["حلقة نقاش", "Panel"], podcast: ["بودكاست", "Podcast"],
    gaming: ["ألعاب", "Gaming"], watch_party: ["مشاهدة جماعية", "Watch party"],
    workshop: ["ورشة عمل", "Workshop"], premiere: ["عرض أول", "Premiere"],
  };
  const pair = labels[type] || [type, type];
  return locale === "ar" ? pair[0] : pair[1];
}

function modeLabel(mode: string, locale: Locale) {
  const c = copy[locale];
  if (mode === "audio") return c.modeAudio;
  if (mode === "hybrid") return c.modeHybrid;
  return c.modeVideo;
}

function formatDate(value: string | null, locale: Locale) {
  if (!value) return copy[locale].timeTba;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return copy[locale].timeTba;
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export default function RAVINEEventsCatalog({ locale, items }: { locale: Locale; items: RAVINEEventItem[] }) {
  const ar = locale === "ar";
  const t = copy[locale];
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({
    upcoming: items.filter((event) => event.status === "scheduled").length,
    live: items.filter((event) => event.status === "live").length,
    ended: items.filter((event) => event.status === "ended").length,
  }), [items]);

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const filtered = items.filter((event) => {
      if (filter === "upcoming" && event.status !== "scheduled") return false;
      if (filter === "live" && event.status !== "live") return false;
      if (filter === "ended" && event.status !== "ended") return false;
      if (!normalized) return true;
      return [event.title, event.description || "", event.creatorName, formatEventType(event.type, locale), modeLabel(event.mode, locale)]
        .join(" ").toLocaleLowerCase(locale).includes(normalized);
    });

    return filtered.sort((left, right) => {
      if (filter === "ended") return (Date.parse(right.endedAt || right.scheduledAt || "") || 0) - (Date.parse(left.endedAt || left.scheduledAt || "") || 0);
      if (filter === "live") return (Date.parse(left.startedAt || left.scheduledAt || "") || 0) - (Date.parse(right.startedAt || right.scheduledAt || "") || 0);
      return (Date.parse(left.scheduledAt || "") || Number.MAX_SAFE_INTEGER) - (Date.parse(right.scheduledAt || "") || Number.MAX_SAFE_INTEGER);
    });
  }, [items, filter, query, locale]);

  const filters: Array<{ id: Filter; label: string; count?: number }> = [
    { id: "all", label: t.all },
    { id: "upcoming", label: t.upcoming, count: counts.upcoming },
    { id: "live", label: t.live, count: counts.live },
    { id: "ended", label: t.ended, count: counts.ended },
  ];

  return (
    <div className={styles.catalog}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{t.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label={ar ? "مسح البحث" : "Clear search"}><X size={15} /></button> : null}
        </label>
        <div className={styles.filterRow} role="group" aria-label={ar ? "تصفية الأحداث" : "Filter events"}>
          {filters.map((item) => (
            <button key={item.id} type="button" className={styles.filterButton + " " + (filter === item.id ? styles.active : "")} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>
              {item.label}{typeof item.count === "number" ? <span>{item.count.toLocaleString(locale)}</span> : null}
            </button>
          ))}
        </div>
      </div>

      {visibleItems.length === 0 ? (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon}><CalendarClock size={20} aria-hidden="true" /></div>
          <strong>{t.noResults}</strong>
          <span>{items.length === 0 ? (ar ? "ستظهر هنا الأحداث التي أُعلن عن مواعيدها." : "Announced event schedules will appear here.") : t.noResultsHelp}</span>
          {query || filter !== "all" ? <button type="button" onClick={() => { setQuery(""); setFilter("all"); }}>{t.clear}</button> : null}
        </div>
      ) : (
        <div className={styles.grid}>
          {visibleItems.map((event) => {
            const statusClass = event.status === "live" ? styles.live : event.status === "ended" ? styles.ended : styles.scheduled;
            return (
              <article className={styles.card} key={event.id} data-status={event.status}>
                <div className={styles.cardTop}>
                  <span className={styles.status + " " + statusClass}>
                    {event.status === "live" ? t.liveStatus : event.status === "ended" ? t.endedStatus : t.scheduled}
                  </span>
                  <span className={styles.type}>{formatEventType(event.type, locale)}</span>
                </div>
                <h2>{event.title}</h2>
                <p className={styles.description}>{event.description || (ar ? "جلسة من مجتمع رَافِين." : "An event from the RAVINE community.")}</p>
                <div className={styles.details}>
                  <span><CalendarClock size={15} aria-hidden="true" />{formatDate(event.scheduledAt, locale)}</span>
                  <span><Clock3 size={15} aria-hidden="true" />{modeLabel(event.mode, locale)}</span>
                </div>
                <div className={styles.host}>
                  {event.creatorAvatar ? <img src={event.creatorAvatar} alt="" loading="lazy" /> : <span className={styles.avatarFallback} aria-hidden="true">{event.creatorName.slice(0, 1)}</span>}
                  <span><small>{t.host}</small><strong>{event.creatorName}</strong></span>
                  {event.creatorId ? <Link href={"/" + locale + "/creators/" + event.creatorId} className={styles.creatorLink}>{ar ? "الملف" : "Profile"}</Link> : null}
                </div>
                <div className={styles.cardFooter}>
                  {event.recordingHref
                    ? <Link className={styles.recordingLink} href={event.recordingHref}><Tv size={15} aria-hidden="true" />{t.recording}</Link>
                    : <span className={styles.noRecording}><Radio size={14} aria-hidden="true" />{t.noRecording}</span>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

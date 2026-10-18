"use client";

import { useMemo, useState } from "react";
import { CalendarPlus, Clock3 } from "lucide-react";
import { createRAVINELiveEventAction } from "@/app/actions/ravine-live-events";
import styles from "./RAVINEEventManagement.module.css";

export type RAVINEEventHostOption = { id: number; label: string };
type Locale = "ar" | "en";

export default function RAVINEEventCreateForm({
  locale,
  creators,
}: {
  locale: Locale;
  creators: RAVINEEventHostOption[];
}) {
  const ar = locale === "ar";
  const [localDate, setLocalDate] = useState("");
  const scheduledISO = useMemo(() => {
    if (!localDate) return "";
    const parsed = new Date(localDate);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : "";
  }, [localDate]);

  const types = [
    ["solo", ar ? "جلسة فردية" : "Solo session"],
    ["co_live", ar ? "بث مشترك" : "Co-live"],
    ["guest", ar ? "ضيف" : "Guest"],
    ["panel", ar ? "حلقة نقاش" : "Panel"],
    ["podcast", ar ? "بودكاست" : "Podcast"],
    ["gaming", ar ? "ألعاب" : "Gaming"],
    ["watch_party", ar ? "مشاهدة جماعية" : "Watch party"],
    ["workshop", ar ? "ورشة عمل" : "Workshop"],
    ["premiere", ar ? "عرض أول" : "Premiere"],
  ];

  return (
    <form action={createRAVINELiveEventAction} className={styles.createForm}>
      <input type="hidden" name="locale" value={locale} />
      <div className={styles.formIntro}>
        <CalendarPlus size={20} aria-hidden="true" />
        <div>
          <strong>{ar ? "أعلن عن جلسة أو عرض قادم." : "Schedule a session or premiere."}</strong>
          <span>{ar ? "إنشاء الموعد لا يبدأ البث تلقائيًا؛ إعدادات مزود البث ما زالت منفصلة." : "Creating a schedule does not start a broadcast; live-provider setup remains separate."}</span>
        </div>
      </div>
      <div className={styles.formGrid}>
        <label>
          <span>{ar ? "الهوية المستضيفة" : "Host identity"}</span>
          <select name="creator_id" required defaultValue={creators.length === 1 ? String(creators[0].id) : ""}>
            {creators.length !== 1 ? <option value="" disabled>{ar ? "اختر هوية المبدع..." : "Choose a creator identity..."}</option> : null}
            {creators.map((creator) => <option key={creator.id} value={creator.id}>{creator.label}</option>)}
          </select>
        </label>
        <label>
          <span>{ar ? "عنوان الحدث" : "Event title"}</span>
          <input name="title" required maxLength={120} placeholder={ar ? "اسم واضح للجلسة أو العرض" : "A clear title for the session or premiere"} />
        </label>
        <label>
          <span>{ar ? "نوع الجلسة" : "Session type"}</span>
          <select name="live_type" defaultValue="solo">
            {types.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>{ar ? "طريقة التقديم" : "Format"}</span>
          <select name="mode" defaultValue="video">
            <option value="video">{ar ? "فيديو" : "Video"}</option>
            <option value="audio">{ar ? "صوت" : "Audio"}</option>
            <option value="hybrid">{ar ? "صوت وفيديو" : "Audio + video"}</option>
          </select>
        </label>
        <label className={styles.dateField}>
          <span><Clock3 size={13} aria-hidden="true" />{ar ? "الموعد حسب توقيت جهازك" : "Time in your device's local timezone"}</span>
          <input type="datetime-local" value={localDate} onChange={(event) => setLocalDate(event.target.value)} />
          <input type="hidden" name="scheduled_at" value={scheduledISO} />
        </label>
        <label className={styles.descriptionField}>
          <span>{ar ? "وصف مختصر" : "Short description"}</span>
          <textarea name="description" maxLength={2000} rows={3} placeholder={ar ? "ما الذي سيحدث في هذا الحدث؟" : "What should people expect from this event?"} />
        </label>
      </div>
      <button className="button primary" type="submit"><CalendarPlus size={15} />{ar ? "نشر الموعد" : "Publish schedule"}</button>
    </form>
  );
}

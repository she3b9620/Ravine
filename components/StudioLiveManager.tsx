"use client";

import { useState } from "react";

type LiveSession = {
  id: string;
  creator_identity_id: number;
  title: string;
  mode: string;
  status: "scheduled" | "live" | "recorded" | "edited" | "published" | "cancelled";
  starts_at: string | null;
  ended_at: string | null;
  related_work_id: number | null;
  created_at: string;
};

type Props = {
  creatorIdentityId: number | null;
  creatorTier: string;
  initialSessions: LiveSession[];
  schemaReady: boolean;
  locale: "ar" | "en";
};

const modes = [
  ["solo", "بث فردي", "Solo live"],
  ["co_live", "بث مشترك", "Co-live"],
  ["guest", "استضافة ضيف", "Guest session"],
  ["panel", "نقاش جماعي", "Panel"],
  ["workshop", "ورشة عمل", "Workshop"],
  ["qa", "أسئلة وأجوبة", "Q&A"],
  ["premiere", "عرض أول", "Premiere"],
  ["watch_party", "مشاهدة جماعية", "Watch party"],
  ["gaming", "ألعاب", "Gaming"],
  ["audio", "صوت فقط", "Audio"],
  ["camera_off", "دون كاميرا", "Camera off"],
  ["bts", "خلف الكواليس", "Behind the scenes"],
  ["sessions", "RAVINE Sessions", "RAVINE Sessions"],
] as const;

const statusLabels: Record<LiveSession["status"], [string, string]> = {
  scheduled: ["مجدول", "Scheduled"],
  live: ["مباشر", "Live"],
  recorded: ["انتهى", "Ended"],
  edited: ["قيد التجهيز", "In post-production"],
  published: ["منشور", "Published"],
  cancelled: ["ملغي", "Cancelled"],
};

export default function StudioLiveManager({ creatorIdentityId, creatorTier, initialSessions, schemaReady, locale }: Props) {
  const ar = locale === "ar";
  const [sessions, setSessions] = useState(initialSessions);
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState("solo");
  const [startsAt, setStartsAt] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function send(payload: Record<string, unknown>) {
    const response = await fetch("/api/live/sessions", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json() as { ok?: boolean; error?: string; session?: LiveSession };
    if (!response.ok || !result.ok || !result.session) {
      throw new Error(result.error || (ar ? "تعذر تنفيذ العملية." : "The operation failed."));
    }
    return result.session;
  }

  async function createSession(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creatorIdentityId) {
      setError(ar ? "هوية المبدع الجديدة غير متاحة بعد. يلزم تثبيت ترحيلات قاعدة البيانات المعتمدة." : "The new creator identity is unavailable. The approved database migrations must be installed first.");
      return;
    }
    if (!title.trim()) {
      setError(ar ? "عنوان الجلسة مطلوب." : "A session title is required.");
      return;
    }
    if (!startsAt || new Date(startsAt).getTime() <= Date.now()) {
      setError(ar ? "حدد موعدًا مستقبليًا للجلسة. بدء البث الفعلي يحتاج إلى ربط مزود Live." : "Choose a future session time. Actual streaming requires a configured Live provider.");
      return;
    }
    setCreating(true);
    setError("");
    setNotice("");
    try {
      const session = await send({
        action: "create",
        creatorIdentityId,
        title: title.trim(),
        mode,
        startsAt: new Date(startsAt).toISOString(),
      });
      setSessions((current) => [session, ...current]);
      setTitle("");
      setStartsAt("");
      setNotice(ar ? "تمت جدولة الجلسة." : "Session scheduled.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setCreating(false);
    }
  }

  async function transition(session: LiveSession, action: "start" | "end" | "cancel") {
    setBusyId(session.id);
    setError("");
    setNotice("");
    try {
      const updated = await send({ action, sessionId: session.id });
      setSessions((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(action === "cancel" ? (ar ? "تم إلغاء الجلسة." : "Session cancelled.") : action === "end" ? (ar ? "تم إنهاء الجلسة وتسجيلها كأرشيف." : "Session ended and marked as recorded.") : (ar ? "تم تحديث حالة الجلسة. بدء الجلسة معطل حتى ربط مزود بث فعلي." : "Session status updated. This starting a session is disabled until a provider is configured."));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : String(reason));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="studio-works" aria-labelledby="studio-live-heading">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / LIVE</div>
          <h2 id="studio-live-heading">{ar ? "إدارة الجلسات المباشرة" : "Live session management"}</h2>
          <p className="section-note">{ar ? "أنشئ مواعيد الجلسات وأدر حالتها من Studio. تشغيل الفيديو والصوت الفعلي يحتاج إلى اعتماد وربط مزود Live." : "Schedule sessions and manage their status from Studio. Actual audio/video streaming requires an approved, configured Live provider."}</p>
        </div>
        <div className="work-kicker">{ar ? "الفئة" : "TIER"} · {creatorTier.replaceAll("_", " ").toUpperCase()}</div>
      </div>

      {!schemaReady ? (
        <div className="empty-state"><strong>{ar ? "ميزة Live تنتظر ترحيلات قاعدة البيانات." : "Live is waiting for the database migrations."}</strong><span>{ar ? "لم يتم تغيير قاعدة البيانات أو نشر أي ترحيل تلقائيًا." : "No database migration has been applied automatically."}</span></div>
      ) : (
        <>
          {error ? <div className="empty-state" role="alert"><strong>{ar ? "تعذر إكمال العملية." : "Could not complete the operation."}</strong><span>{error}</span></div> : null}
          {notice ? <div className="empty-state" role="status"><strong>{notice}</strong></div> : null}

          <form className="studio-inline-form" onSubmit={(event) => void createSession(event)}>
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={200} required placeholder={ar ? "عنوان الجلسة" : "Session title"} aria-label={ar ? "عنوان الجلسة" : "Session title"} />
            <div className="studio-form-grid">
              <select value={mode} onChange={(event) => setMode(event.target.value)} aria-label={ar ? "نوع الجلسة" : "Session type"}>
                {modes.map(([value, labelAr, labelEn]) => <option value={value} key={value}>{ar ? labelAr : labelEn}</option>)}
              </select>
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} required aria-label={ar ? "موعد الجلسة" : "Session start time"} />
            </div>
            <div className="studio-work-actions">
              <button className="button primary" type="submit" disabled={creating || creatorTier === "viewer"}>{creating ? "…" : ar ? "جدولة الجلسة" : "Schedule session"}</button>
            </div>
            {creatorTier === "viewer" ? <p className="section-note">{ar ? "المشاهدون يمكنهم متابعة البث، لكن لا يمكنهم إنشاء جلسات مباشرة." : "Viewers can watch live sessions but cannot create them."}</p> : null}
          </form>

          <div className="studio-work-list">
            {!sessions.length ? <div className="empty-state"><strong>{ar ? "لا توجد جلسات بعد." : "No sessions yet."}</strong></div> : sessions.map((session) => {
              const status = statusLabels[session.status] || statusLabels.scheduled;
              const modeLabel = modes.find(([value]) => value === session.mode);
              const busy = busyId === session.id;
              return (
                <article className="studio-work-row" key={session.id}>
                  <div className="studio-work-main">
                    <div className="video-kicker">{ar ? status[0] : status[1]} · {ar ? modeLabel?.[1] || session.mode : modeLabel?.[2] || session.mode}</div>
                    <h3>{session.title}</h3>
                    <p>{session.starts_at ? new Date(session.starts_at).toLocaleString(ar ? "ar-EG" : "en-US", { dateStyle: "medium", timeStyle: "short" }) : (ar ? "لم يحدد الموعد" : "Time not set")}</p>
                  </div>
                  <div className="studio-work-actions">
                    {session.status === "scheduled" ? <button className="button secondary" type="button" disabled title={ar ? "يلزم ربط مزود بث فعلي أولًا" : "A real streaming provider must be configured first"}>{ar ? "مزود البث غير مربوط" : "Provider not connected"}</button> : null}
                    {session.status === "live" ? <button className="button secondary" type="button" onClick={() => void transition(session, "end")} disabled={busy}>{ar ? "إنهاء" : "End"}</button> : null}
                    {session.status === "scheduled" ? <button className="button secondary" type="button" onClick={() => void transition(session, "cancel")} disabled={busy}>{ar ? "إلغاء" : "Cancel"}</button> : null}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

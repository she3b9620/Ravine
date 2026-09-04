"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Work = {
  id: number;
  title: string;
  description: string | null;
  content_type: string | null;
  quality: string | null;
  published: boolean | null;
  video_url: string | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
};

type Props = {
  works: Work[];
  locale: "ar" | "en";
};

export default function StudioWorkManager({ works: initialWorks, locale }: Props) {
  const ar = locale === "ar";
  const [works, setWorks] = useState(initialWorks);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("video");
  const [editQuality, setEditQuality] = useState("1080p");
  const [error, setError] = useState("");

  function beginEdit(work: Work) {
    setEditingId(work.id);
    setEditTitle(work.title);
    setEditDescription(work.description || "");
    setEditType(work.content_type || "video");
    setEditQuality(work.quality || "1080p");
    setError("");
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim()) {
      setError(ar ? "العنوان مطلوب." : "Title is required.");
      return;
    }
    setBusyId(id);
    setError("");
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("videos")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        content_type: editType,
        quality: editQuality,
      })
      .eq("id", id)
      .select("id,title,description,content_type,quality,published,video_url,views,likes,created_at")
      .single();

    if (updateError || !data) {
      setError(updateError?.message || (ar ? "تعذر التحديث." : "Update failed."));
    } else {
      setWorks((current) => current.map((work) => (work.id === id ? (data as Work) : work)));
      setEditingId(null);
    }
    setBusyId(null);
  }

  async function togglePublished(work: Work) {
    setBusyId(work.id);
    setError("");
    const supabase = createClient();
    const { data, error: updateError } = await supabase
      .from("videos")
      .update({ published: !work.published })
      .eq("id", work.id)
      .select("id,title,description,content_type,quality,published,video_url,views,likes,created_at")
      .single();

    if (updateError || !data) {
      setError(updateError?.message || (ar ? "تعذر تغيير حالة النشر." : "Could not change publishing state."));
    } else {
      setWorks((current) => current.map((item) => (item.id === work.id ? (data as Work) : item)));
    }
    setBusyId(null);
  }

  async function removeWork(work: Work) {
    const confirmed = window.confirm(
      ar ? `حذف العمل «${work.title}» نهائيًا؟` : `Delete “${work.title}” permanently?`
    );
    if (!confirmed) return;

    setBusyId(work.id);
    setError("");
    const supabase = createClient();
    const { error: deleteError } = await supabase.from("videos").delete().eq("id", work.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      if (work.video_url) {
        await supabase.storage.from("videos").remove([work.video_url]);
      }
      setWorks((current) => current.filter((item) => item.id !== work.id));
    }
    setBusyId(null);
  }

  if (!works.length) {
    return <div className="empty-state"><strong>{ar ? "لا توجد أعمال بعد." : "No works yet."}</strong><span>{ar ? "استخدم النموذج أعلاه لإضافة أول عمل." : "Use the form above to add your first work."}</span></div>;
  }

  return (
    <div className="studio-works">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / WORKS</div>
          <h2>{ar ? "إدارة أعمالك" : "Manage your work"}</h2>
          <p className="section-note">{ar ? "عدّل البيانات، انشر العمل أو أخفِه، أو احذفه." : "Edit metadata, publish or hide a work, or remove it."}</p>
        </div>
      </div>

      {error ? <div className="empty-state"><strong>{ar ? "حدث خطأ." : "Something went wrong."}</strong><span>{error}</span></div> : null}

      <div className="studio-work-list">
        {works.map((work) => {
          const editing = editingId === work.id;
          const busy = busyId === work.id;
          return (
            <article className="studio-work-row" key={work.id}>
              <div className="studio-work-main">
                <div className="video-kicker">{work.published ? (ar ? "منشور" : "PUBLISHED") : (ar ? "مسودة" : "DRAFT")} · {work.content_type || "video"} · {work.quality || "1080p"}</div>
                {editing ? (
                  <div className="studio-inline-form">
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder={ar ? "العنوان" : "Title"} />
                    <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={3} placeholder={ar ? "الوصف" : "Description"} />
                    <div className="studio-form-grid">
                      <select value={editType} onChange={(event) => setEditType(event.target.value)}>
                        <option value="video">Video</option>
                        <option value="short">Short</option>
                        <option value="documentary">Documentary</option>
                        <option value="podcast">Podcast</option>
                        <option value="film">Film</option>
                      </select>
                      <select value={editQuality} onChange={(event) => setEditQuality(event.target.value)}>
                        <option value="1080p">1080p</option>
                        <option value="1440p">1440p</option>
                        <option value="2160p">4K</option>
                      </select>
                    </div>
                    <div className="studio-work-actions">
                      <button className="button primary" type="button" onClick={() => saveEdit(work.id)} disabled={busy}>{ar ? "حفظ" : "Save"}</button>
                      <button className="button secondary" type="button" onClick={() => setEditingId(null)} disabled={busy}>{ar ? "إلغاء" : "Cancel"}</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3>{work.title}</h3>
                    <p>{work.description || (ar ? "بدون وصف." : "No description.")}</p>
                    <div className="video-stats"><span>{Number(work.views || 0).toLocaleString()} {ar ? "مشاهدة" : "views"}</span><span>{Number(work.likes || 0).toLocaleString()} {ar ? "إعجاب" : "likes"}</span></div>
                  </>
                )}
              </div>
              {!editing ? (
                <div className="studio-work-actions">
                  <button className="button secondary" type="button" onClick={() => beginEdit(work)} disabled={busy}>{ar ? "تعديل" : "Edit"}</button>
                  <button className="button secondary" type="button" onClick={() => togglePublished(work)} disabled={busy}>{busy ? "…" : work.published ? (ar ? "إخفاء" : "Unpublish") : (ar ? "نشر" : "Publish")}</button>
                  <button className="button secondary" type="button" onClick={() => removeWork(work)} disabled={busy}>{ar ? "حذف" : "Delete"}</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

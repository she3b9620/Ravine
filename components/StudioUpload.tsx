"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = { creatorId: number; locale: "ar" | "en" };

export default function StudioUpload({ creatorId, locale }: Props) {
  const ar = locale === "ar";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("video");
  const [quality, setQuality] = useState("1080p");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!title.trim() || !file) {
      setError(ar ? "العنوان وملف الفيديو مطلوبان." : "Title and video file are required.");
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setError(ar ? "رفع الفيديو غير مهيأ بعد. يجب إعداد Cloudinary في إعدادات المشروع." : "Video upload is not configured yet. Configure Cloudinary in the project settings.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error(ar ? "يجب تسجيل الدخول أولًا." : "You must be signed in first.");

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", uploadPreset);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as { secure_url?: string; public_id?: string; duration?: number; error?: { message?: string } };
      if (!response.ok || !payload.secure_url) throw new Error(payload.error?.message || (ar ? "تعذر رفع الفيديو." : "Video upload failed."));

      const { error: insertError } = await supabase.from("videos").insert({
        creator_id: creatorId,
        user_id: auth.user.id,
        title: title.trim(),
        description: description.trim() || null,
        video_url: payload.secure_url,
        duration: payload.duration || null,
        published: false,
        content_type: contentType,
        quality,
        is_creator_content: true,
        views: 0,
        likes: 0,
      });
      if (insertError) throw insertError;

      setTitle("");
      setDescription("");
      setFile(null);
      setMessage(ar ? "تم رفع الأصل إلى Cloudinary وحفظ العمل كمسودة." : "The source was uploaded to Cloudinary and saved as a draft.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="studio-upload" onSubmit={submit}>
      <div className="section-head"><div><div className="eyebrow">RAVINE / NEW WORK</div><h2>{ar ? "أضف عملًا جديدًا" : "Add a new work"}</h2><p className="section-note">{ar ? "الأصل المرئي يمر عبر طبقة Cloudinary، بينما تظل بيانات العمل وقواعد النشر في RAVINE." : "Media travels through Cloudinary while work metadata and publication rules remain in RAVINE."}</p></div></div>
      <div className="studio-form-grid">
        <label><span>{ar ? "العنوان" : "Title"}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? "اسم العمل" : "Work title"} /></label>
        <label><span>{ar ? "نوع المحتوى" : "Content type"}</span><select value={contentType} onChange={(event) => setContentType(event.target.value)}><option value="video">Video</option><option value="short">Short</option><option value="documentary">Documentary</option><option value="podcast">Podcast</option><option value="film">Film</option></select></label>
        <label className="studio-form-wide"><span>{ar ? "الوصف" : "Description"}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={ar ? "السياق، الفكرة، وما الذي يجب أن يعرفه المشاهد." : "Context, intent, and what the viewer should know."} /></label>
        <label><span>{ar ? "الجودة" : "Quality"}</span><select value={quality} onChange={(event) => setQuality(event.target.value)}><option value="1080p">1080p</option><option value="1440p">1440p</option><option value="2160p">4K</option></select></label>
        <label><span>{ar ? "ملف الفيديو" : "Video file"}</span><input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /></label>
      </div>
      {error ? <div className="empty-state"><strong>{ar ? "تعذر حفظ العمل." : "Work could not be saved."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}
      <button className="button primary" type="submit" disabled={busy}>{busy ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "رفع وحفظ كمسودة" : "Upload and save draft")}</button>
    </form>
  );
}

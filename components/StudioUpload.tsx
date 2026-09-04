"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  creatorId: number;
  locale: "ar" | "en";
};

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

    setBusy(true);
    const supabase = createClient();
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBusy(false);
      setError(ar ? "يجب تسجيل الدخول أولًا." : "You must be signed in first.");
      return;
    }

    const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
    const path = `${creatorId}/${crypto.randomUUID()}-${safeName}`;

    const upload = await supabase.storage.from("videos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type || "video/mp4",
    });

    if (upload.error) {
      setBusy(false);
      setError(upload.error.message);
      return;
    }

    const { error: insertError } = await supabase.from("videos").insert({
      creator_id: creatorId,
      user_id: auth.user.id,
      title: title.trim(),
      description: description.trim() || null,
      video_url: path,
      published: false,
      content_type: contentType,
      quality,
      is_creator_content: true,
      views: 0,
      likes: 0,
    });

    if (insertError) {
      await supabase.storage.from("videos").remove([path]);
      setBusy(false);
      setError(insertError.message);
      return;
    }

    setTitle("");
    setDescription("");
    setFile(null);
    setBusy(false);
    setMessage(ar ? "تم حفظ العمل كمسودة. سيأتي النشر والمراجعة التحريرية في الخطوة التالية." : "Work saved as a draft. Publishing and editorial review come next.");
  }

  return (
    <form className="studio-upload" onSubmit={submit}>
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / NEW WORK</div>
          <h2>{ar ? "أضف عملًا جديدًا" : "Add a new work"}</h2>
          <p className="section-note">{ar ? "ارفع الأصل واحفظه كمسودة خاصة بملفك." : "Upload the source and save it as a private draft attached to your creator profile."}</p>
        </div>
      </div>
      <div className="studio-form-grid">
        <label>
          <span>{ar ? "العنوان" : "Title"}</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? "اسم العمل" : "Work title"} />
        </label>
        <label>
          <span>{ar ? "نوع المحتوى" : "Content type"}</span>
          <select value={contentType} onChange={(event) => setContentType(event.target.value)}>
            <option value="video">Video</option>
            <option value="short">Short</option>
            <option value="documentary">Documentary</option>
            <option value="podcast">Podcast</option>
            <option value="film">Film</option>
          </select>
        </label>
        <label className="studio-form-wide">
          <span>{ar ? "الوصف" : "Description"}</span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={ar ? "السياق، الفكرة، وما الذي يجب أن يعرفه المشاهد." : "Context, intent, and what the viewer should know."} />
        </label>
        <label>
          <span>{ar ? "الجودة" : "Quality"}</span>
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="1080p">1080p</option>
            <option value="1440p">1440p</option>
            <option value="2160p">4K</option>
          </select>
        </label>
        <label>
          <span>{ar ? "ملف الفيديو" : "Video file"}</span>
          <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska" onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>
      </div>
      {error ? <div className="empty-state"><strong>{ar ? "تعذر حفظ العمل." : "Work could not be saved."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}
      <button className="button primary" type="submit" disabled={busy}>{busy ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "حفظ كمسودة" : "Save draft")}</button>
    </form>
  );
}

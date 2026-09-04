"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Props = { creatorId: number; locale: "ar" | "en" };

type CloudinaryUpload = {
  secure_url?: string;
  public_id?: string;
  duration?: number;
  resource_type?: string;
  error?: { message?: string };
};

type MediaAsset = {
  work_id: number;
  kind: "main" | "trailer" | "preview";
  media_url: string | null;
  public_id: string | null;
  duration: number | null;
  mime_type: string | null;
  sort_order: number;
};

const videoAccept = "video/mp4,video/webm,video/quicktime,video/x-matroska";
const audioAccept = "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,audio/x-m4a";

export default function StudioUpload({ creatorId, locale }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("video");
  const [quality, setQuality] = useState("1080p");
  const [visibility, setVisibility] = useState("public");
  const [file, setFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isPodcast = contentType === "podcast";
  const isShort = contentType === "short";
  const isVideoLike = contentType === "video" || contentType === "film" || contentType === "documentary";

  async function uploadToCloudinary(
    uploadFile: File,
    cloudName: string,
    uploadPreset: string,
  ): Promise<CloudinaryUpload> {
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("upload_preset", uploadPreset);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`, {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json()) as CloudinaryUpload;
    if (!response.ok || !payload.secure_url) {
      throw new Error(payload.error?.message || (ar ? "تعذر رفع الملف." : "Media upload failed."));
    }
    return payload;
  }

  function validateAuxiliaryMedia(kind: "trailer" | "preview", upload: CloudinaryUpload) {
    const duration = typeof upload.duration === "number" ? upload.duration : null;
    if (kind === "preview" && duration !== null && duration > 30.5) {
      throw new Error(ar ? "الـPreview للفيديو لا يمكن أن يتجاوز 30 ثانية." : "A video preview cannot exceed 30 seconds.");
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!title.trim() || !file) {
      setError(ar ? "العنوان وملف العمل مطلوبان." : "Title and work media are required.");
      return;
    }

    if (isShort && trailerFile) {
      setError(ar ? "الشورت نفسه لا يحتاج Trailer؛ يمكن أن يكون مستقلًا أو مرتبطًا بعمل لاحقًا." : "Shorts do not need a trailer; they can remain independent or link to a work later.");
      return;
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
    if (!cloudName || !uploadPreset) {
      setError(ar ? "رفع الوسائط غير مهيأ بعد. يجب إعداد Cloudinary في إعدادات المشروع." : "Media upload is not configured yet. Configure Cloudinary in the project settings.");
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error(ar ? "يجب تسجيل الدخول أولًا." : "You must be signed in first.");

      const mainUpload = await uploadToCloudinary(file, cloudName, uploadPreset);
      const trailerUpload = trailerFile ? await uploadToCloudinary(trailerFile, cloudName, uploadPreset) : null;
      const previewUpload = previewFile ? await uploadToCloudinary(previewFile, cloudName, uploadPreset) : null;

      if (previewUpload) validateAuxiliaryMedia("preview", previewUpload);

      const { data: work, error: insertError } = await supabase
        .from("videos")
        .insert({
          creator_id: creatorId,
          user_id: auth.user.id,
          title: title.trim(),
          description: description.trim() || null,
          video_url: mainUpload.secure_url,
          duration: mainUpload.duration || null,
          published: false,
          visibility,
          content_type: contentType,
          quality,
          is_creator_content: true,
          views: 0,
          likes: 0,
        })
        .select("id")
        .single();
      if (insertError || !work) throw insertError || new Error(ar ? "تعذر إنشاء العمل." : "Could not create the work.");

      const mediaAssets: MediaAsset[] = [
        {
          work_id: work.id,
          kind: "main",
          media_url: mainUpload.secure_url ?? null,
          public_id: mainUpload.public_id ?? null,
          duration: mainUpload.duration ?? null,
          mime_type: file.type || null,
          sort_order: 0,
        },
        ...(trailerUpload
          ? [{
              work_id: work.id,
              kind: "trailer" as const,
              media_url: trailerUpload.secure_url ?? null,
              public_id: trailerUpload.public_id ?? null,
              duration: trailerUpload.duration ?? null,
              mime_type: trailerFile?.type || null,
              sort_order: 1,
            }]
          : []),
        ...(previewUpload
          ? [{
              work_id: work.id,
              kind: "preview" as const,
              media_url: previewUpload.secure_url ?? null,
              public_id: previewUpload.public_id ?? null,
              duration: previewUpload.duration ?? null,
              mime_type: previewFile?.type || null,
              sort_order: 2,
            }]
          : []),
      ];

      const { error: assetsError } = await supabase.from("work_media_assets").insert(mediaAssets);
      if (assetsError) throw assetsError;

      setTitle("");
      setDescription("");
      setContentType("video");
      setQuality("1080p");
      setVisibility("public");
      setFile(null);
      setTrailerFile(null);
      setPreviewFile(null);
      setMessage(ar ? "تم رفع العمل وحفظه كمسودة مع إعدادات الظهور والـTrailer/Preview." : "The work was uploaded and saved as a draft with visibility and optional trailer/preview settings.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="studio-upload" onSubmit={submit}>
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / NEW WORK</div>
          <h2>{ar ? "أضف عملًا جديدًا" : "Add a new work"}</h2>
          <p className="section-note">
            {ar
              ? "الأصل المرئي يمر عبر طبقة Cloudinary، بينما تظل بيانات العمل وقواعد الظهور والنشر في RAVINE."
              : "Media travels through Cloudinary while work metadata, visibility, and publication rules remain in RAVINE."}
          </p>
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
          <span>{ar ? "الظهور" : "Visibility"}</span>
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="public">{ar ? "عام" : "Public"}</option>
            <option value="followers">{ar ? "المتابعون فقط" : "Followers"}</option>
            <option value="unlisted">{ar ? "بالرابط فقط" : "Unlisted"}</option>
            <option value="private">{ar ? "خاص" : "Private"}</option>
            <option value="custom">{ar ? "جمهور مخصص" : "Custom audience"}</option>
          </select>
        </label>

        <label className="studio-form-wide">
          <span>{ar ? (isPodcast ? "ملف الحلقة الصوتي/المرئي" : "ملف العمل") : (isPodcast ? "Episode audio/video" : "Work media")}</span>
          <input type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        {!isShort ? (
          <label>
            <span>{ar ? "Trailer اختياري" : "Optional trailer"}</span>
            <input type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)} />
          </label>
        ) : null}

        {isVideoLike ? (
          <label>
            <span>{ar ? "Preview اختياري · حتى 30 ثانية" : "Optional preview · up to 30s"}</span>
            <input type="file" accept={videoAccept} onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)} />
          </label>
        ) : null}
      </div>

      {visibility === "custom" ? (
        <div className="empty-state">
          <strong>{ar ? "الجمهور المخصص محفوظ كنوع وصول" : "Custom audience is prepared as an access mode"}</strong>
          <span>{ar ? "اختيار الأشخاص/الأعضاء المسموح لهم سيُدار من واجهة الوصول المخصصة في الخطوة التالية." : "Selecting the allowed people or members will be handled by the dedicated access UI next."}</span>
        </div>
      ) : null}

      {error ? <div className="empty-state"><strong>{ar ? "تعذر حفظ العمل." : "Work could not be saved."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}

      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "رفع وحفظ كمسودة" : "Upload and save draft")}
      </button>
    </form>
  );
}

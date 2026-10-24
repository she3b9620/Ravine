"use client";

import { FormEvent, useRef, useState } from "react";
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

const videoAccept = "video/mp4,video/webm,video/quicktime,video/x-matroska";
const audioAccept = "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,audio/x-m4a";
const maxUploadBytes = 500 * 1024 * 1024;

function mapUploadError(error: unknown, ar: boolean) {
  const message = error instanceof Error ? error.message : String(error);
  const code = message.trim();
  const copy: Record<string, [string, string]> = {
    RAVINE_AUTH_REQUIRED: ["يجب تسجيل الدخول أولًا.", "You must be signed in first."],
    RAVINE_UPLOAD_OWNER_MISMATCH: ["لا يمكنك رفع العمل بهذه الهوية.", "This creator identity is not owned by the current account."],
    RAVINE_SHORT_QUOTA_EXCEEDED: ["وصلت إلى حد الشورتات الشهري لهذا الحساب.", "This account has reached its monthly Shorts limit."],
    RAVINE_VIDEO_QUOTA_EXCEEDED: ["وصلت إلى الحد الشهري للفيديوهات والأفلام القصيرة والمطوّلة والوثائقيات والمسلسلات لهذا الحساب.", "This account has reached its monthly quota for videos, short films, feature films, documentaries, and series."],
    RAVINE_SERIES_EPISODE_METADATA_REQUIRED: ["أدخل اسم المسلسل ورقم الموسم والحلقة.", "Enter the series title, season number, and episode number."],
    RAVINE_SERIES_OWNER_MISMATCH: ["لا يمكنك إضافة حلقة إلى مسلسل لا تملكه.", "You cannot add an episode to a series you do not own."],
    RAVINE_PODCAST_QUOTA_EXCEEDED: ["وصلت إلى حد البودكاست الشهري لهذا الحساب.", "This account has reached its monthly Podcast limit."],
    RAVINE_INVALID_CONTENT_TYPE: ["نوع المحتوى غير مدعوم.", "This content type is not supported."],
  };
  if (copy[code]) return ar ? copy[code][0] : copy[code][1];
  return message;
}

export default function StudioUpload({ creatorId, locale }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [contentType, setContentType] = useState("video");
  const [seriesTitle, setSeriesTitle] = useState("");
  const [seriesDescription, setSeriesDescription] = useState("");
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [episodeNumber, setEpisodeNumber] = useState("1");
  const [quality, setQuality] = useState("1080p");
  const [visibility, setVisibility] = useState("public");
  const [file, setFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const mainFileInputRef = useRef<HTMLInputElement>(null);
  const trailerFileInputRef = useRef<HTMLInputElement>(null);
  const previewFileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isPodcast = contentType === "podcast";
  const isShort = contentType === "short";
  const isSeries = contentType === "series";
  const isVideoLike = contentType === "video" || contentType === "short_film" || contentType === "film" || contentType === "documentary" || isSeries;

  function validateSelectedFile(selectedFile: File, kind: "main" | "trailer" | "preview") {
    if (selectedFile.size > maxUploadBytes) {
      throw new Error(ar ? "حجم الملف يتجاوز الحد الأقصى 500 ميجابايت." : "The file exceeds the 500 MB upload limit.");
    }
    const isAudio = selectedFile.type.startsWith("audio/");
    if (kind === "preview" && isAudio) {
      throw new Error(ar ? "ملف الـPreview يجب أن يكون فيديو." : "A preview must be a video file.");
    }
    if (isPodcast ? (!isAudio && !selectedFile.type.startsWith("video/")) : !selectedFile.type.startsWith("video/")) {
      throw new Error(ar ? "صيغة الملف غير مدعومة لهذا النوع من المحتوى." : "This file format is not supported for the selected content type.");
    }
  }

  async function uploadToRavine(uploadFile: File): Promise<CloudinaryUpload> {
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("creatorId", String(creatorId));
    const response = await fetch("/api/studio/upload-media", { method: "POST", body: formData });
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

    if (isSeries) {
      const season = Number(seasonNumber);
      const episode = Number(episodeNumber);
      if (!seriesTitle.trim() || !Number.isInteger(season) || season < 1 || !Number.isInteger(episode) || episode < 1) {
        setError(ar ? "أدخل اسم المسلسل ورقم موسم وحلقة صحيحين (١ أو أكثر)." : "Enter a series title and valid season and episode numbers (1 or higher).");
        return;
      }
    }

    if (isShort && trailerFile) {
      setError(ar ? "الشورت نفسه لا يحتاج Trailer؛ يمكن أن يكون مستقلًا أو مرتبطًا بعمل لاحقًا." : "Shorts do not need a trailer; they can remain independent or link to a work later.");
      return;
    }

    try {
      validateSelectedFile(file, "main");
      if (trailerFile) validateSelectedFile(trailerFile, "trailer");
      if (previewFile) validateSelectedFile(previewFile, "preview");
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : String(validationError));
      return;
    }

    setBusy(true);
    try {
      const supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("RAVINE_AUTH_REQUIRED");

      const mainUpload = await uploadToRavine(file);
      const trailerUpload = trailerFile ? await uploadToRavine(trailerFile) : null;
      const previewUpload = previewFile ? await uploadToRavine(previewFile) : null;

      if (previewUpload) validateAuxiliaryMedia("preview", previewUpload);

      let seriesId: number | null = null;
      if (isSeries) {
        const { data: existingSeries, error: seriesLookupError } = await supabase
          .from("ravine_series_titles")
          .select("id")
          .eq("creator_id", creatorId)
          .eq("title", seriesTitle.trim())
          .maybeSingle();
        if (seriesLookupError) throw seriesLookupError;

        if (existingSeries) {
          seriesId = Number(existingSeries.id);
        } else {
          const { data: newSeries, error: seriesInsertError } = await supabase
            .from("ravine_series_titles")
            .insert({
              creator_id: creatorId,
              user_id: auth.user.id,
              title: seriesTitle.trim(),
              description: seriesDescription.trim() || null,
              poster_url: null,
              published: false,
              visibility,
            })
            .select("id")
            .single();
          if (seriesInsertError || !newSeries) throw seriesInsertError || new Error(ar ? "تعذر إن��اء سجل المسلسل." : "Could not create the series record.");
          seriesId = Number(newSeries.id);
        }
      }

      const aspectRatio = isShort ? "9:16" : "16:9";
      const mediaAssets = [
        { kind: "main", mediaUrl: mainUpload.secure_url, publicId: mainUpload.public_id, duration: mainUpload.duration, mimeType: file.type, sortOrder: 0 },
        ...(trailerUpload ? [{ kind: "trailer", mediaUrl: trailerUpload.secure_url, publicId: trailerUpload.public_id, duration: trailerUpload.duration, mimeType: trailerFile?.type, sortOrder: 1 }] : []),
        ...(previewUpload ? [{ kind: "preview", mediaUrl: previewUpload.secure_url, publicId: previewUpload.public_id, duration: previewUpload.duration, mimeType: previewFile?.type, sortOrder: 2 }] : []),
      ];
      const createResponse = await fetch("/api/studio/create-work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          creatorId,
          title,
          description,
          videoUrl: mainUpload.secure_url,
          duration: mainUpload.duration,
          contentType,
          quality,
          visibility,
          seriesId,
          seasonNumber: isSeries ? Number(seasonNumber) : null,
          episodeNumber: isSeries ? Number(episodeNumber) : null,
          aspectRatio,
          mediaAssets,
        }),
      });
      const createPayload = (await createResponse.json()) as { ok?: boolean; error?: string };
      if (!createResponse.ok || !createPayload.ok) throw new Error(createPayload.error || (ar ? "تعذر إنشاء العمل." : "Could not create the work."));

      setTitle("");
      setDescription("");
      setContentType("video");
      setSeriesTitle("");
      setSeriesDescription("");
      setSeasonNumber("1");
      setEpisodeNumber("1");
      setQuality("1080p");
      setVisibility("public");
      setFile(null);
      setTrailerFile(null);
      setPreviewFile(null);
      if (mainFileInputRef.current) mainFileInputRef.current.value = "";
      if (trailerFileInputRef.current) trailerFileInputRef.current.value = "";
      if (previewFileInputRef.current) previewFileInputRef.current.value = "";
      setMessage(ar ? "تم رفع العمل وحفظه كمسودة مع إعدادات الظهور والـTrailer/Preview." : "The work was uploaded and saved as a draft with visibility and optional trailer/preview settings.");
      router.refresh();
    } catch (submitError) {
      setError(mapUploadError(submitError, ar));
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
            {ar ? "الأصل المرئي يمر عبر طبقة Cloudinary، بينما تظل بيانات العمل وقواعد الظهور والنشر في RAVINE." : "Media travels through Cloudinary while work metadata, visibility, and publication rules remain in RAVINE."}
          </p>
        </div>
      </div>

      <div className="studio-form-grid">
        <label><span>{ar ? (isSeries ? "اسم الحلقة" : "العنوان") : (isSeries ? "Episode title" : "Title")}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={ar ? (isSeries ? "اسم الحلقة" : "اسم العمل") : (isSeries ? "Episode title" : "Work title")} /></label>

        <label>
          <span>{ar ? "نوع المحتوى" : "Content type"}</span>
          <select value={contentType} onChange={(event) => setContentType(event.target.value)}>
            <option value="short">{ar ? "شورتات" : "Shorts"}</option>
            <option value="video">{ar ? "فيديو" : "Video"}</option>
            <option value="podcast">{ar ? "بودكاست" : "Podcast"}</option>
            <option value="documentary">{ar ? "وثائقي" : "Documentary"}</option>
            <option value="short_film">{ar ? "فيلم قصير" : "Short Film"}</option>
            <option value="film">{ar ? "فيلم مطوّل" : "Feature Film"}</option>
            <option value="series">{ar ? "مسلسل" : "Series"}</option>
          </select>
        </label>

        {isSeries ? (
          <>
            <label className="studio-form-wide"><span>{ar ? "اسم المسلسل" : "Series title"}</span><input value={seriesTitle} onChange={(event) => setSeriesTitle(event.target.value)} placeholder={ar ? "اسم العمل المتسلسل" : "Show or series title"} /></label>
            <label className="studio-form-wide"><span>{ar ? "نبذة المسلسل (اختياري)" : "Series overview (optional)"}</span><textarea value={seriesDescription} onChange={(event) => setSeriesDescription(event.target.value)} rows={3} placeholder={ar ? "نبذة مشتركة تظهر في صفحة المسلسل." : "Shared synopsis shown on the series page."} /></label>
            <label><span>{ar ? "رقم الموسم" : "Season number"}</span><input type="number" min="1" step="1" value={seasonNumber} onChange={(event) => setSeasonNumber(event.target.value)} /></label>
            <label><span>{ar ? "رقم الحلقة" : "Episode number"}</span><input type="number" min="1" step="1" value={episodeNumber} onChange={(event) => setEpisodeNumber(event.target.value)} /></label>
          </>
        ) : null}

        <label className="studio-form-wide"><span>{ar ? (isSeries ? "وصف الحلقة" : "الوصف") : (isSeries ? "Episode description" : "Description")}</span><textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} placeholder={ar ? "السياق، الفكرة، وما الذي يجب أن يعرفه المشاهد." : "Context, intent, and what the viewer should know."} /></label>

        <label>
          <span>{ar ? "الجودة" : "Quality"}</span>
          <select value={quality} onChange={(event) => setQuality(event.target.value)}>
            <option value="1080p">1080p</option>
            <option value="2k">2K</option>
            <option value="4k">4K</option>
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
          <input ref={mainFileInputRef} type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        {!isShort ? (
          <label><span>{ar ? "Trailer اختياري" : "Optional trailer"}</span><input ref={trailerFileInputRef} type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)} /></label>
        ) : null}

        {isVideoLike ? (
          <label><span>{ar ? "Preview اختياري · حتى 30 ثانية" : "Optional preview · up to 30s"}</span><input ref={previewFileInputRef} type="file" accept={videoAccept} onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)} /></label>
        ) : null}
      </div>

      {visibility === "custom" ? <div className="empty-state"><strong>{ar ? "الجمهور المخصص محفوظ كنوع وصول" : "Custom audience is prepared as an access mode"}</strong><span>{ar ? "اختيار الأشخاص/الأعضاء المسموح لهم سيُدار من واجهة الوصول المخصصة في الخطوة التالية." : "Selecting the allowed people or members will be handled by the dedicated access UI next."}</span></div> : null}
      {error ? <div className="empty-state"><strong>{ar ? "تعذر حفظ العمل." : "Work could not be saved."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}

      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "رفع وحفظ كمسودة" : "Upload and save draft")}
      </button>
    </form>
  );
}

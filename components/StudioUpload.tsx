"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isAllowedRavineMediaFile } from "@/lib/ravine-media-validation.mjs";

type Props = { creatorId: number; locale: "ar" | "en" };

type CloudinaryUpload = {
  secure_url?: string;
  public_id?: string;
  duration?: number;
  resource_type?: string;
  error?: { message?: string };
};

type CloudinarySignedUpload = {
  cloudName?: string;
  apiKey?: string;
  timestamp?: number;
  signature?: string;
  folder?: string;
  publicId?: string;
  overwrite?: "false";
  error?: string;
};

type StudioUploadProgress = {
  label: string;
  percent: number;
  loadedBytes: number;
  totalBytes: number;
  elapsedSeconds: number;
  speedBytesPerSecond: number;
  remainingSeconds: number | null;
  stage: "uploading" | "saving";
};

function formatUploadBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; value >= 1024 && index < units.length; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toFixed(value >= 100 ? 0 : 1)} ${unit}`;
}

function formatUploadTime(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "—";
  if (seconds < 60) return `${Math.max(0, Math.ceil(seconds))}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.ceil(seconds % 60);
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

type MediaAsset = {
  work_id: number;
  kind: "main" | "trailer" | "preview";
  media_url: string | null;
  public_id: string | null;
  duration: number | null;
  mime_type: string | null;
  sort_order: number;
};

const videoAccept = "video/mp4,video/webm,video/quicktime,video/x-matroska,.mp4,.webm,.mov,.mkv";
const audioAccept = "audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/aac,audio/x-m4a,.mp3,.m4a,.wav,.ogg,.aac";

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
    RAVINE_CLOUDINARY_NOT_CONFIGURED: ["رفع الوسائط غير مهيأ بعد؛ يجب استكمال إعدادات Cloudinary على الخادم.", "Cloudinary is not configured on the server yet. Add the required server-side environment variables."],
  };
  if (copy[code]) return ar ? copy[code][0] : copy[code][1];
  return ar ? "تعذّر رفع العمل أو حفظ بياناته. تحقق من الملف والاتصال ثم حاول مجددًا." : "The work could not be uploaded or saved. Check the file and connection, then try again.";
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
  const [busy, setBusy] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<StudioUploadProgress | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isPodcast = contentType === "podcast";
  const isShort = contentType === "short";
  const isSeries = contentType === "series";
  const isVideoLike = contentType === "video" || contentType === "short_film" || contentType === "film" || contentType === "documentary" || isSeries;

  async function uploadToCloudinary(
    uploadFile: File,
    creatorId: number,
    label: string,
    onProgress: (progress: StudioUploadProgress) => void,
  ): Promise<CloudinaryUpload> {
    onProgress({
      label,
      percent: 0,
      loadedBytes: 0,
      totalBytes: uploadFile.size,
      elapsedSeconds: 0,
      speedBytesPerSecond: 0,
      remainingSeconds: null,
      stage: "uploading",
    });

    const signatureResponse = await fetch("/api/studio/cloudinary-signature", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ creatorId }),
    });
    const signed = (await signatureResponse.json().catch(() => ({}))) as CloudinarySignedUpload;
    const cloudName = signed.cloudName;
    const apiKey = signed.apiKey;
    const timestamp = signed.timestamp;
    const uploadSignature = signed.signature;
    const folder = signed.folder;
    const publicId = signed.publicId;
    if (!signatureResponse.ok || !cloudName || !apiKey || typeof timestamp !== "number" ||
        !uploadSignature || !folder || !publicId) {
      throw new Error(signed.error || (ar ? "تعذر تجهيز رفع آمن إلى Cloudinary." : "Could not prepare a secure Cloudinary upload."));
    }

    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("api_key", apiKey);
    formData.append("timestamp", String(timestamp));
    formData.append("signature", uploadSignature);
    formData.append("folder", folder);
    formData.append("public_id", publicId);
    formData.append("overwrite", "false");

    return await new Promise<CloudinaryUpload>((resolve, reject) => {
      const request = new XMLHttpRequest();
      const startedAt = Date.now();
      request.open(
        "POST",
        `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/video/upload`,
      );
      request.timeout = 30 * 60 * 1000;
      request.upload.onprogress = (event) => {
        const elapsedSeconds = Math.max(0.1, (Date.now() - startedAt) / 1000);
        const loadedBytes = Math.min(event.loaded, uploadFile.size);
        const speedBytesPerSecond = loadedBytes / elapsedSeconds;
        const remainingBytes = Math.max(0, uploadFile.size - loadedBytes);
        onProgress({
          label,
          percent: event.lengthComputable
            ? Math.min(100, Math.round((event.loaded / event.total) * 100))
            : Math.min(99, Math.round((loadedBytes / Math.max(1, uploadFile.size)) * 100)),
          loadedBytes,
          totalBytes: uploadFile.size,
          elapsedSeconds,
          speedBytesPerSecond,
          remainingSeconds: speedBytesPerSecond > 0 ? Math.ceil(remainingBytes / speedBytesPerSecond) : null,
          stage: "uploading",
        });
      };
      request.onerror = () => reject(new Error(ar ? "انقطع الاتصال أثناء رفع الملف." : "The connection was interrupted during upload."));
      request.ontimeout = () => reject(new Error(ar ? "انتهت مهلة رفع الملف. جرّب اتصالًا أكثر استقرارًا." : "The upload timed out. Please retry with a more stable connection."));
      request.onload = () => {
        let payload: CloudinaryUpload;
        try {
          payload = JSON.parse(request.responseText) as CloudinaryUpload;
        } catch {
          reject(new Error(ar ? "استجاب Cloudinary ببيانات غير مفهومة." : "Cloudinary returned an unreadable response."));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !payload.secure_url) {
          reject(new Error(payload.error?.message || (ar ? "تعذر رفع الملف إلى Cloudinary." : "Cloudinary media upload failed.")));
          return;
        }
        onProgress({
          label,
          percent: 100,
          loadedBytes: uploadFile.size,
          totalBytes: uploadFile.size,
          elapsedSeconds: Math.max(0, (Date.now() - startedAt) / 1000),
          speedBytesPerSecond: uploadFile.size / Math.max(0.1, (Date.now() - startedAt) / 1000),
          remainingSeconds: 0,
          stage: "uploading",
        });
        resolve(payload);
      };
      request.send(formData);
    });
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
    if (!isAllowedRavineMediaFile(file, isPodcast)) {
      setError(ar
        ? (isPodcast ? "ملف البودكاست يجب أن يكون صوتًا مدعومًا أو فيديو بصيغة MP4 أو WebM أو MOV أو MKV." : "ملف العمل يجب أن يكون فيديو بصيغة MP4 أو WebM أو MOV أو MKV.")
        : (isPodcast ? "Podcast media must be a supported audio file or MP4, WebM, MOV, or MKV video." : "Work media must be an MP4, WebM, MOV, or MKV video."));
      return;
    }
    if (trailerFile && !isAllowedRavineMediaFile(trailerFile, isPodcast)) {
      setError(ar ? "صيغة ملف الـTrailer غير مدعومة لهذا النوع من المحتوى." : "The selected trailer format is not supported for this content type.");
      return;
    }
    if (previewFile && !isAllowedRavineMediaFile(previewFile, false)) {
      setError(ar ? "صيغة ملف الـPreview غير مدعومة؛ اختر ملف فيديو مدعومًا." : "The preview format is unsupported; choose a supported video file.");
      return;
    }

    setBusy(true);
    setUploadProgress(null);
    const uploadedPublicIds: string[] = [];
    let createdWorkId: number | null = null;
    let createdSeriesId: number | null = null;
    let signedInUserId: string | null = null;
    let supabase: ReturnType<typeof createClient> | null = null;
    try {
      supabase = createClient();
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("RAVINE_AUTH_REQUIRED");
      signedInUserId = auth.user.id;

      const updateUploadProgress = (progress: StudioUploadProgress) => setUploadProgress(progress);
      const mainUpload = await uploadToCloudinary(
        file,
        creatorId,
        ar ? "ملف العمل الأساسي" : "Main work media",
        updateUploadProgress,
      );
      if (mainUpload.public_id) uploadedPublicIds.push(mainUpload.public_id);

      const trailerUpload = trailerFile
        ? await uploadToCloudinary(trailerFile, creatorId, ar ? "الـTrailer" : "Trailer", updateUploadProgress)
        : null;
      if (trailerUpload?.public_id) uploadedPublicIds.push(trailerUpload.public_id);

      const previewUpload = previewFile
        ? await uploadToCloudinary(previewFile, creatorId, ar ? "الـPreview" : "Preview", updateUploadProgress)
        : null;
      if (previewUpload?.public_id) uploadedPublicIds.push(previewUpload.public_id);

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
          if (seriesInsertError || !newSeries) throw seriesInsertError || new Error(ar ? "تعذر إنشاء سجل المسلسل." : "Could not create the series record.");
          seriesId = Number(newSeries.id);
          createdSeriesId = seriesId;
        }
      }

      const aspectRatio = isShort ? "9:16" : "16:9";
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
          ...(isSeries ? { series_id: seriesId, season_number: Number(seasonNumber), episode_number: Number(episodeNumber) } : {}),
          aspect_ratio: aspectRatio,
          quality,
          is_creator_content: true,
          views: 0,
          likes: 0,
        })
        .select("id")
        .single();
      if (insertError || !work) throw insertError || new Error(ar ? "تعذر إنشاء العمل." : "Could not create the work.");
      createdWorkId = Number(work.id);

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
          ? [{ work_id: work.id, kind: "trailer" as const, media_url: trailerUpload.secure_url ?? null, public_id: trailerUpload.public_id ?? null, duration: trailerUpload.duration ?? null, mime_type: trailerFile?.type || null, sort_order: 1 }]
          : []),
        ...(previewUpload
          ? [{ work_id: work.id, kind: "preview" as const, media_url: previewUpload.secure_url ?? null, public_id: previewUpload.public_id ?? null, duration: previewUpload.duration ?? null, mime_type: previewFile?.type || null, sort_order: 2 }]
          : []),
      ];

      setUploadProgress({
        label: ar ? "حفظ بيانات العمل" : "Saving work metadata",
        percent: 100,
        loadedBytes: file.size,
        totalBytes: file.size,
        elapsedSeconds: 0,
        speedBytesPerSecond: 0,
        remainingSeconds: 0,
        stage: "saving",
      });
      const { error: assetsError } = await supabase.from("work_media_assets").insert(mediaAssets);
      if (assetsError) throw assetsError;

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
      setMessage(ar ? "تم رفع العمل وحفظه كمسودة مع إعدادات الظهور والـTrailer/Preview." : "The work was uploaded and saved as a draft with visibility and optional trailer/preview settings.");
      setUploadProgress(null);
      router.refresh();
    } catch (submitError) {
      let cleanupVerified = true;
      let seriesRollbackVerified = true;
      if (uploadedPublicIds.length || createdWorkId !== null || createdSeriesId !== null) {
        // Always attempt to remove a partially created work, even if a
        // malformed/partial media response did not yield a public_id.
        let mayCleanUploads = createdWorkId === null;

        if (createdWorkId !== null) {
          try {
            const deleteResponse = await fetch("/api/studio/delete-work", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ videoId: createdWorkId }),
            });
            const deletePayload = await deleteResponse.json().catch(() => ({})) as { ok?: boolean };
            mayCleanUploads = deleteResponse.ok && deletePayload.ok === true;
          } catch {
            mayCleanUploads = false;
          }
        }

        // Remove only the new, still-empty series record created by this
        // submission. If its episode cannot be ruled out, preserve the series.
        if (mayCleanUploads && createdSeriesId !== null && signedInUserId && supabase) {
          try {
            const { data: remainingEpisodes, error: episodeCheckError } = await supabase
              .from("videos")
              .select("id")
              .eq("series_id", createdSeriesId)
              .limit(1);
            if (episodeCheckError || remainingEpisodes?.length) {
              seriesRollbackVerified = false;
            } else {
              const { error: seriesDeleteError } = await supabase
                .from("ravine_series_titles")
                .delete()
                .eq("id", createdSeriesId)
                .eq("creator_id", creatorId)
                .eq("user_id", signedInUserId);
              if (seriesDeleteError) seriesRollbackVerified = false;
            }
          } catch {
            seriesRollbackVerified = false;
          }
        } else if (createdSeriesId !== null && (!mayCleanUploads || !signedInUserId || !supabase)) {
          seriesRollbackVerified = false;
        }

        if (mayCleanUploads && uploadedPublicIds.length) {
          try {
            const cleanupResponse = await fetch("/api/studio/cleanup-uploads", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ creatorId, publicIds: uploadedPublicIds }),
            });
            const cleanupPayload = await cleanupResponse.json().catch(() => ({})) as { ok?: boolean };
            cleanupVerified = cleanupResponse.ok && cleanupPayload.ok === true;
          } catch {
            cleanupVerified = false;
          }
        } else if (!mayCleanUploads && uploadedPublicIds.length) {
          // Never delete media if deleting a partially created database work
          // was not confirmed.
          cleanupVerified = false;
        }
      }

      const baseMessage = mapUploadError(submitError, ar);
      const cleanupNotice = ar
        ? " لم نتمكن من تأكيد تنظيف كل ملفات الرفع المؤقتة. افتح الاستوديو وتحقق من حالة المسودة قبل إعادة الرفع."
        : " We could not verify cleanup of every temporary upload. Check Studio for a retained draft before uploading again.";
      const seriesNotice = ar
        ? " لم نتمكن من تأكيد إزالة سجل المسلسل المؤقت؛ تحقق من الاستوديو قبل تكرار العملية."
        : " We could not confirm removal of the temporary series record; check Studio before retrying.";
      setError(baseMessage + (cleanupVerified ? "" : cleanupNotice) + (seriesRollbackVerified ? "" : seriesNotice));
    } finally {
      setBusy(false);
      setUploadProgress(null);
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
          <input type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
        </label>

        {!isShort ? (
          <label><span>{ar ? "Trailer اختياري" : "Optional trailer"}</span><input type="file" accept={isPodcast ? `${videoAccept},${audioAccept}` : videoAccept} onChange={(event) => setTrailerFile(event.target.files?.[0] ?? null)} /></label>
        ) : null}

        {isVideoLike ? (
          <label><span>{ar ? "Preview اختياري · حتى 30 ثانية" : "Optional preview · up to 30s"}</span><input type="file" accept={videoAccept} onChange={(event) => setPreviewFile(event.target.files?.[0] ?? null)} /></label>
        ) : null}
      </div>

      {visibility === "custom" ? <div className="empty-state"><strong>{ar ? "الجمهور المخصص محفوظ كنوع وصول" : "Custom audience is prepared as an access mode"}</strong><span>{ar ? "اختيار الأشخاص/الأعضاء المسموح لهم سيُدار من واجهة الوصول المخصصة في الخطوة التالية." : "Selecting the allowed people or members will be handled by the dedicated access UI next."}</span></div> : null}
      {error ? <div className="empty-state"><strong>{ar ? "تعذر حفظ العمل." : "Work could not be saved."}</strong><span>{error}</span></div> : null}
      {message ? <div className="empty-state"><strong>{ar ? "تم الحفظ." : "Saved."}</strong><span>{message}</span></div> : null}

      {busy && uploadProgress ? (
        <div className="studio-upload-progress" role="status" aria-live="polite">
          <div className="studio-upload-progress__heading">
            <strong>{uploadProgress.label}</strong>
            <span>{uploadProgress.stage === "saving" ? (ar ? "جارٍ الحفظ" : "Saving") : `${uploadProgress.percent}%`}</span>
          </div>
          <div className="studio-upload-progress__track" aria-label={ar ? "تقدم الرفع" : "Upload progress"}>
            <span style={{ width: `${uploadProgress.percent}%` }} />
          </div>
          <div className="studio-upload-progress__details">
            <span>{formatUploadBytes(uploadProgress.loadedBytes)} / {formatUploadBytes(uploadProgress.totalBytes)}</span>
            <span>{ar ? "السرعة" : "Speed"}: {uploadProgress.speedBytesPerSecond > 0 ? `${formatUploadBytes(uploadProgress.speedBytesPerSecond)}/s` : "—"}</span>
            <span>{ar ? "المتبقي" : "ETA"}: {formatUploadTime(uploadProgress.remainingSeconds)}</span>
          </div>
        </div>
      ) : null}
      <button className="button primary" type="submit" disabled={busy}>
        {busy ? (ar ? "جارٍ الرفع…" : "Uploading…") : (ar ? "رفع وحفظ كمسودة" : "Upload and save draft")}
      </button>
    </form>
  );
}

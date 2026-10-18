"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";
import styles from "./HeroMediaManager.module.css";

type Locale = "ar" | "en";
type HeroItem = {
  id: number;
  media_type: "video" | "image";
  title: string;
  media_url: string;
  thumbnail_url: string | null;
  video_id: number | null;
  sort_order: number;
  is_active: boolean;
};
type UploadKind = "image" | "video";
type UploadPhase = "uploading" | "saving";
type UploadProgress = {
  kind: UploadKind;
  fileName: string;
  totalBytes: number;
  loadedBytes: number;
  percent: number;
  startedAt: number;
  phase: UploadPhase;
};

type CandidateVideo = {
  id: number;
  title: string;
  video_url: string | null;
  thumbnail_url: string | null;
  content_type: string | null;
  created_at: string | null;
};

export default function HeroMediaManager({ locale }: { locale: Locale }) {
  const ar = locale === "ar";
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<HeroItem[]>([]);
  const [videos, setVideos] = useState<CandidateVideo[]>([]);
  const [curatedMode, setCuratedMode] = useState(false);
  const [imageTitle, setImageTitle] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [progressNow, setProgressNow] = useState(Date.now());
  const [busyId, setBusyId] = useState<number | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const sortedItems = useMemo(
    () => [...items].sort((a, b) => a.sort_order - b.sort_order || a.id - b.id),
    [items],
  );
  const selectedVideoIds = useMemo(
    () => new Set(items.filter((item) => item.media_type === "video" && item.video_id !== null).map((item) => Number(item.video_id))),
    [items],
  );

  async function reload() {
    setLoading(true);
    setError("");
    const [itemsResult, settingsResult, videosResult] = await Promise.all([
      supabase.from("ravine_hero_media_items").select("id,media_type,title,media_url,thumbnail_url,video_id,sort_order,is_active").order("sort_order", { ascending: true }).order("id", { ascending: true }),
      supabase.from("ravine_hero_settings").select("use_curated_media").eq("id", 1).maybeSingle(),
      supabase.from("videos").select("id,title,video_url,thumbnail_url,content_type,created_at")
        .eq("published", true).eq("visibility", "public")
        .in("content_type", ["short", "video", "documentary", "short_film", "film", "series"])
        .order("created_at", { ascending: false }).limit(200),
    ]);
    if (itemsResult.error) setError((ar ? "تعذر تحميل قائمة الهيرو: " : "Could not load hero items: ") + itemsResult.error.message);
    else setItems((itemsResult.data ?? []) as HeroItem[]);
    if (settingsResult.error) setError((ar ? "تعذر قراءة إعدادات الهيرو: " : "Could not load hero settings: ") + settingsResult.error.message);
    else setCuratedMode(Boolean(settingsResult.data?.use_curated_media));
    if (videosResult.error) setError((ar ? "تعذر تحميل الفيديوهات المتاحة: " : "Could not load eligible videos: ") + videosResult.error.message);
    else setVideos(((videosResult.data ?? []) as CandidateVideo[]).filter((video) => Boolean(video.video_url)));
    setLoading(false);
  }

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    if (!uploadProgress) return;
    const timer = window.setInterval(() => setProgressNow(Date.now()), 500);
    return () => window.clearInterval(timer);
  }, [uploadProgress?.startedAt]);

  async function addVideo(video: CandidateVideo) {
    setError("");
    setNotice("");
    if (selectedVideoIds.has(video.id)) {
      setError(ar ? "الفيديو موجود بالفعل في القائمة." : "This video is already in the hero list.");
      return;
    }
    const nextOrder = (sortedItems.reduce((highest, item) => Math.max(highest, item.sort_order), -10)) + 10;
    const { data, error: insertError } = await supabase.from("ravine_hero_media_items").insert({
      media_type: "video",
      title: video.title || (ar ? "فيديو بدون عنوان" : "Untitled video"),
      media_url: video.video_url,
      thumbnail_url: video.thumbnail_url,
      video_id: video.id,
      sort_order: nextOrder,
      is_active: true,
    }).select("id,media_type,title,media_url,thumbnail_url,video_id,sort_order,is_active").single();
    if (insertError || !data) {
      setError((ar ? "تعذر إضافة الفيديو: " : "Could not add video: ") + (insertError?.message || "Unknown error"));
      return;
    }
    setItems((current) => [...current, data as HeroItem]);
    setNotice(ar ? "أُضيف الفيديو إلى قائمة الهيرو. فعّل وضع الاختيارات اليدوية ليظهر بدل القائمة التلقائية." : "Video added. Enable curated mode to show your selected list instead of the automatic feed.");
  }

  function beginUploadProgress(kind: UploadKind, file: File) {
    const startedAt = Date.now();
    setProgressNow(startedAt);
    setUploadProgress({
      kind,
      fileName: file.name,
      totalBytes: file.size,
      loadedBytes: 0,
      percent: 0,
      startedAt,
      phase: "uploading",
    });
  }

  async function uploadFileWithProgress(
    file: File,
    objectPath: string,
    contentType: string,
    kind: UploadKind,
  ): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getSession();
    const accessToken = authData.session?.access_token;
    if (authError || !accessToken) {
      throw new Error(ar
        ? "انتهت جلسة تسجيل الدخول أو تعذر التحقق منها. سجّل الدخول مجددًا."
        : "Your sign-in session is missing or expired. Please sign in again.");
    }

    const encodedPath = objectPath.split("/").map((segment) => encodeURIComponent(segment)).join("/");
    const endpoint = supabaseUrl.replace(/\/+$/, "") + "/storage/v1/object/ravine-hero-media/" + encodedPath;

    await new Promise<void>((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", endpoint);
      request.setRequestHeader("apikey", supabasePublishableKey);
      request.setRequestHeader("Authorization", "Bearer " + accessToken);
      request.setRequestHeader("cache-control", "max-age=3600");
      request.setRequestHeader("content-type", contentType);
      request.setRequestHeader("x-upsert", "false");

      request.upload.onprogress = (event) => {
        const totalBytes = event.lengthComputable && event.total > 0 ? event.total : file.size;
        const loadedBytes = Math.min(event.loaded, totalBytes);
        setProgressNow(Date.now());
        setUploadProgress((current) => {
          if (!current || current.kind !== kind) return current;
          return {
            ...current,
            loadedBytes,
            totalBytes,
            percent: totalBytes > 0 ? Math.min(100, Math.round((loadedBytes / totalBytes) * 100)) : 0,
          };
        });
      };

      request.onload = () => {
        if (request.status >= 200 && request.status < 300) {
          setProgressNow(Date.now());
          setUploadProgress((current) => current && current.kind === kind
            ? { ...current, loadedBytes: file.size, totalBytes: file.size, percent: 100, phase: "saving" }
            : current);
          resolve();
          return;
        }

        let message = "Storage upload failed (" + request.status + ").";
        try {
          const payload = JSON.parse(request.responseText) as { message?: string; error?: string };
          message = payload.message || payload.error || message;
        } catch {
          // Keep the status-based message when the server does not return JSON.
        }
        reject(new Error(message));
      };

      request.onerror = () => reject(new Error(ar
        ? "انقطع الاتصال أثناء رفع الملف. تحقّق من الإنترنت وأعد المحاولة."
        : "The connection was interrupted during upload. Check your internet connection and try again."));
      request.onabort = () => reject(new Error(ar ? "تم إيقاف الرفع قبل اكتماله." : "The upload was cancelled before completion."));
      request.send(file);
    });
  }

  function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const unitIndex = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, unitIndex);
    return value.toFixed(unitIndex === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2) + " " + units[unitIndex];
  }

  function formatDuration(seconds: number | null): string {
    if (seconds === null || !Number.isFinite(seconds)) return ar ? "جارٍ الحساب…" : "Calculating…";
    const wholeSeconds = Math.max(0, Math.ceil(seconds));
    const hours = Math.floor(wholeSeconds / 3600);
    const minutes = Math.floor((wholeSeconds % 3600) / 60);
    const remainder = wholeSeconds % 60;
    if (hours > 0) return ar ? hours + " س " + minutes + " د" : hours + "h " + minutes + "m";
    if (minutes > 0) return ar ? minutes + " د " + remainder + " ث" : minutes + "m " + remainder + "s";
    return ar ? remainder + " ثانية" : remainder + "s";
  }

  function renderUploadProgress(kind: UploadKind) {
    const current = uploadProgress?.kind === kind ? uploadProgress : null;
    if (!current) return null;

    const elapsedSeconds = Math.max(0, (progressNow - current.startedAt) / 1000);
    const averageBytesPerSecond = elapsedSeconds > 0.5 ? current.loadedBytes / elapsedSeconds : 0;
    const remainingSeconds = current.phase === "uploading" && averageBytesPerSecond > 0
      ? Math.max(0, (current.totalBytes - current.loadedBytes) / averageBytesPerSecond)
      : null;
    const progressLabel = kind === "video"
      ? (ar ? "تقدّم رفع الفيديو" : "Video upload progress")
      : (ar ? "تقدّم رفع الصورة" : "Image upload progress");

    return (
      <div className={styles.uploadProgress} role="status" aria-live="polite">
        <div className={styles.progressHeading}>
          <strong>{current.phase === "saving"
            ? (ar ? "اكتمل نقل الملف — جارٍ حفظه في قائمة الهيرو" : "File uploaded — saving it to the hero list")
            : progressLabel}</strong>
          <span>{current.phase === "saving" ? "100%" : current.percent + "%"}</span>
        </div>
        <progress
          className={styles.progressBar}
          max={100}
          value={current.phase === "saving" ? 100 : current.percent}
          aria-label={progressLabel}
        />
        <div className={styles.progressStats}>
          <span>{ar ? "المُرفَع" : "Uploaded"}: <b>{formatBytes(current.loadedBytes)} / {formatBytes(current.totalBytes)}</b></span>
          <span>{ar ? "الوقت المنقضي" : "Elapsed"}: <b>{formatDuration(elapsedSeconds)}</b></span>
          <span>{ar ? "السرعة التقريبية" : "Avg. speed"}: <b>{averageBytesPerSecond > 0 ? formatBytes(averageBytesPerSecond) + "/s" : (ar ? "جارٍ البدء…" : "Starting…")}</b></span>
          <span>{ar ? "الوقت المتبقي" : "Time left"}: <b>{current.phase === "saving"
            ? (ar ? "جارٍ الحفظ…" : "Saving…")
            : formatDuration(remainingSeconds)}</b></span>
        </div>
        <div className={styles.progressFileName} title={current.fileName}>{current.fileName}</div>
      </div>
    );
  }

  async function uploadHeroVideo(file: File) {
    setError("");
    setNotice("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const typeByExtension: Record<string, string> = {
      mp4: "video/mp4",
      m4v: "video/x-m4v",
      webm: "video/webm",
      mov: "video/quicktime",
      mkv: "video/x-matroska",
    };
    const allowedTypes = new Set(Object.values(typeByExtension));
    const contentType = allowedTypes.has(file.type) ? file.type : typeByExtension[extension];
    if (!contentType) {
      setError(ar ? "اختَر فيديو بصيغة MP4 أو WebM أو MOV أو MKV أو M4V." : "Choose an MP4, WebM, MOV, MKV, or M4V video.");
      return;
    }
    if (file.size > 2 * 1024 * 1024 * 1024) {
      setError(ar ? "حجم الفيديو أكبر من الحد المسموح به (2 جيجابايت)." : "Video size exceeds the 2 GB upload limit.");
      return;
    }

    setUploading(true);
    beginUploadProgress("video", file);
    try {
      const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "hero-video";
      const objectPath = "videos/" + Date.now() + "-" + crypto.randomUUID() + "-" + safeName;
      await uploadFileWithProgress(file, objectPath, contentType, "video");

      const { data: publicFile } = supabase.storage.from("ravine-hero-media").getPublicUrl(objectPath);
      if (!publicFile.publicUrl) throw new Error("Could not create a public URL for the uploaded video.");

      const { data, error: insertError } = await supabase.from("ravine_hero_media_items").insert({
        media_type: "video",
        title: videoTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        media_url: publicFile.publicUrl,
        thumbnail_url: null,
        video_id: null,
        sort_order: (sortedItems.reduce((highest, item) => Math.max(highest, item.sort_order), -10)) + 10,
        is_active: true,
      }).select("id,media_type,title,media_url,thumbnail_url,video_id,sort_order,is_active").single();
      if (insertError || !data) throw new Error(insertError?.message || "Could not save hero video.");
      setItems((current) => [...current, data as HeroItem]);
      setVideoTitle("");
      setNotice(ar ? "تم رفع الفيديو وإضافته للهيرو مباشرةً، دون الحاجة لنشره كعمل في المنصة." : "Hero video uploaded directly; it does not need to be published as a platform work.");
    } catch (uploadError) {
      setError((ar ? "تعذر رفع فيديو الهيرو: " : "Hero video upload failed: ") + (uploadError instanceof Error ? uploadError.message : String(uploadError)));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setProgressNow(Date.now());
    }
  }

  async function uploadImage(file: File) {
    setError("");
    setNotice("");
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const typeByExtension: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
    };
    const allowedTypes = new Set(Object.values(typeByExtension));
    const contentType = allowedTypes.has(file.type) ? file.type : typeByExtension[extension];
    if (!contentType) {
      setError(ar ? "اختَر صورة بصيغة JPG أو PNG أو WebP." : "Choose a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError(ar ? "حجم الصورة أكبر من 25 ميجابايت." : "Image size must be 25 MB or less.");
      return;
    }

    setUploading(true);
    beginUploadProgress("image", file);
    try {
      const safeName = file.name.normalize("NFKD").replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "").slice(-120) || "hero-image";
      const objectPath = "images/" + Date.now() + "-" + crypto.randomUUID() + "-" + safeName;
      await uploadFileWithProgress(file, objectPath, contentType, "image");

      const { data: publicFile } = supabase.storage.from("ravine-hero-media").getPublicUrl(objectPath);
      if (!publicFile.publicUrl) throw new Error("Could not create a public URL for the uploaded image.");

      const { data, error: insertError } = await supabase.from("ravine_hero_media_items").insert({
        media_type: "image",
        title: imageTitle.trim() || file.name.replace(/\.[^.]+$/, ""),
        media_url: publicFile.publicUrl,
        thumbnail_url: publicFile.publicUrl,
        video_id: null,
        sort_order: (sortedItems.reduce((highest, item) => Math.max(highest, item.sort_order), -10)) + 10,
        is_active: true,
      }).select("id,media_type,title,media_url,thumbnail_url,video_id,sort_order,is_active").single();
      if (insertError || !data) throw new Error(insertError?.message || "Could not save image selection.");
      setItems((current) => [...current, data as HeroItem]);
      setImageTitle("");
      setNotice(ar ? "تم رفع الصورة وإضافتها إلى قائمة الهيرو." : "Image uploaded and added to the hero list.");
    } catch (uploadError) {
      setError((ar ? "تعذر رفع الصورة: " : "Image upload failed: ") + (uploadError instanceof Error ? uploadError.message : String(uploadError)));
    } finally {
      setUploading(false);
      setUploadProgress(null);
      setProgressNow(Date.now());
    }
  }

  async function moveItem(id: number, direction: -1 | 1) {
    const ordered = [...sortedItems];
    const index = ordered.findIndex((item) => item.id === id);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= ordered.length) return;
    const current = ordered[index];
    const neighbour = ordered[nextIndex];
    setBusyId(id);
    setError("");
    const first = await supabase.from("ravine_hero_media_items").update({ sort_order: neighbour.sort_order, updated_at: new Date().toISOString() }).eq("id", current.id);
    const second = first.error ? first : await supabase.from("ravine_hero_media_items").update({ sort_order: current.sort_order, updated_at: new Date().toISOString() }).eq("id", neighbour.id);
    if (first.error || second.error) {
      setError((ar ? "تعذر تغيير الترتيب: " : "Could not reorder items: ") + (first.error?.message || second.error?.message || ""));
      await reload();
    } else {
      const next = [...ordered];
      next[index] = { ...current, sort_order: neighbour.sort_order };
      next[nextIndex] = { ...neighbour, sort_order: current.sort_order };
      setItems(next);
    }
    setBusyId(null);
  }

  async function toggleItem(item: HeroItem) {
    setBusyId(item.id);
    setError("");
    const { error: updateError } = await supabase.from("ravine_hero_media_items")
      .update({ is_active: !item.is_active, updated_at: new Date().toISOString() }).eq("id", item.id);
    if (updateError) setError((ar ? "تعذر تغيير حالة الوسيط: " : "Could not update media state: ") + updateError.message);
    else setItems((current) => current.map((row) => row.id === item.id ? { ...row, is_active: !item.is_active } : row));
    setBusyId(null);
  }

  async function removeItem(item: HeroItem) {
    const confirmed = window.confirm(ar ? "إزالة «" + item.title + "» من قائمة الهيرو؟ لن يتم حذف الملف الأصلي من مساحة التخزين." : "Remove “" + item.title + "” from the hero list? The original Storage file will not be deleted.");
    if (!confirmed) return;
    setBusyId(item.id);
    setError("");
    const { error: deleteError } = await supabase.from("ravine_hero_media_items").delete().eq("id", item.id);
    if (deleteError) setError((ar ? "تعذر إزالة الوسيط: " : "Could not remove item: ") + deleteError.message);
    else setItems((current) => current.filter((row) => row.id !== item.id));
    setBusyId(null);
  }

  async function toggleCuratedMode(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.checked;
    if (next && sortedItems.every((item) => !item.is_active)) {
      setError(ar ? "أضف وسيطًا واحدًا على الأقل وفعّله قبل اعتماد الاختيارات اليدوية." : "Add and activate at least one item before enabling curated mode.");
      event.target.checked = false;
      return;
    }
    setSavingMode(true);
    setError("");
    const { data: auth } = await supabase.auth.getUser();
    const { error: updateError } = await supabase.from("ravine_hero_settings").update({
      use_curated_media: next,
      updated_by: auth.user?.id ?? null,
      updated_at: new Date().toISOString(),
    }).eq("id", 1);
    if (updateError) setError((ar ? "تعذر حفظ إعداد الهيرو: " : "Could not save hero mode: ") + updateError.message);
    else {
      setCuratedMode(next);
      setNotice(next
        ? (ar ? "تم تفعيل الاختيارات اليدوية؛ سيعرض الهيرو العناصر النشطة فقط وبالترتيب المحدد." : "Curated mode is on. The hero will show only active selections in your chosen order.")
        : (ar ? "عاد الهيرو إلى الاختيار التلقائي من الأعمال العامة المنشورة." : "The hero is back to automatic selection from published public works."));
    }
    setSavingMode(false);
  }

  return (
    <div className={styles.manager} dir={ar ? "rtl" : "ltr"}>
      <section className={styles.modePanel}>
        <div className={styles.modeCopy}>
          <strong>{ar ? "مصدر محتوى الهيرو" : "Hero content source"}</strong>
          <p>{ar ? "أوقف الاختيارات اليدوية ليختار رَافِين تلقائيًا من الأعمال العامة. فعّلها لاستخدام قائمتك المحددة فقط." : "Turn curated mode off to use the automatic public-work feed. Turn it on to use only your selected list."}</p>
        </div>
        <label className={styles.switchRow}>
          <input type="checkbox" checked={curatedMode} onChange={(event) => void toggleCuratedMode(event)} disabled={savingMode || loading} />
          <span className={styles.switchTrack} aria-hidden="true"><span /></span>
          <span>{savingMode ? (ar ? "جارٍ الحفظ…" : "Saving…") : curatedMode ? (ar ? "اختياراتي اليدوية مفعّلة" : "Curated selections are active") : (ar ? "الاختيار التلقائي مفعّل" : "Automatic selection is active")}</span>
        </label>
      </section>

      {error ? <div className={styles.feedbackError} role="alert">{error}</div> : null}
      {notice ? <div className={styles.feedbackSuccess} role="status">{notice}</div> : null}

      <div className={styles.columns}>
        <section className={styles.panel}>
          <div className={styles.panelHead}><div><div className={styles.kicker}>01 / VIDEO</div><h2>{ar ? "اختَر فيديوهات الهيرو" : "Select hero videos"}</h2><p>{ar ? "فقط الفيديوهات المنشورة للعامة تظهر هنا." : "Only published public videos appear here."}</p></div><span className={styles.count}>{selectedVideoIds.size}</span></div>
          <label className={styles.field}><span>{ar ? "اسم فيديو الهيرو (اختياري)" : "Hero video title (optional)"}</span><input value={videoTitle} onChange={(event) => setVideoTitle(event.target.value)} maxLength={120} placeholder={ar ? "مثال: مشهد افتتاحي 01" : "e.g. Opening cinematic 01"} /></label>
          <label className={styles.uploadBox}>
            <input type="file" accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-m4v" disabled={uploading} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadHeroVideo(file).finally(() => { input.value = ""; }); }} />
            <span className={styles.uploadIcon}>{uploading && uploadProgress?.kind === "video" ? "…" : "▶"}</span>
            <strong>{uploading && uploadProgress?.kind === "video" ? (ar ? "جارٍ رفع فيديو الهيرو…" : "Uploading hero video…") : (ar ? "ارفع فيديو مخصصًا للهيرو من جهازك" : "Upload a dedicated hero video")}</strong>
            <small>{ar ? "MP4 أو WebM أو MOV. لا يلزم نشره كعمل في رَافِين." : "MP4, WebM, or MOV. It does not need to be published as a RAVINE work."}</small>
          </label>
          {renderUploadProgress("video")}
          <div className={styles.subsectionLabel}>{ar ? "أو اختَر فيديو منشورًا للعامة" : "Or select a published public video"}</div>
          <div className={styles.candidateList}>
            {loading ? <div className={styles.empty}>{ar ? "جارٍ تحميل الفيديوهات…" : "Loading videos…"}</div> : videos.length === 0 ? <div className={styles.empty}>{ar ? "لا توجد فيديوهات عامة مؤهلة حتى الآن." : "No eligible public videos yet."}</div> : videos.map((video) => {
              const selected = selectedVideoIds.has(video.id);
              return <article className={styles.candidate} key={video.id}>
                <div className={styles.thumb}>{video.thumbnail_url ? <img src={video.thumbnail_url} alt="" /> : <span>▶</span>}</div>
                <div className={styles.candidateCopy}><strong>{video.title || (ar ? "بدون عنوان" : "Untitled")}</strong><small>{video.content_type || "video"} · #{video.id}</small></div>
                <button type="button" className={styles.smallAction} onClick={() => void addVideo(video)} disabled={selected || loading}>{selected ? (ar ? "مضاف" : "Added") : (ar ? "إضافة" : "Add")}</button>
              </article>;
            })}
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHead}><div><div className={styles.kicker}>02 / STILL IMAGE</div><h2>{ar ? "أضف صور الهيرو" : "Add hero images"}</h2><p>{ar ? "ارفع صورًا ثابتة مخصصة لوضع الصور، منفصلة عن صور معاينة الفيديوهات." : "Upload still images dedicated to image mode, separate from video thumbnails."}</p></div><span className={styles.count}>{items.filter((item) => item.media_type === "image").length}</span></div>
          <label className={styles.field}><span>{ar ? "اسم الصورة (اختياري)" : "Image title (optional)"}</span><input value={imageTitle} onChange={(event) => setImageTitle(event.target.value)} maxLength={120} placeholder={ar ? "مثال: لقطة سينمائية 01" : "e.g. Cinematic still 01"} /></label>
          <label className={styles.uploadBox}>
            <input type="file" accept="image/*" disabled={uploading} onChange={(event) => { const input = event.currentTarget; const file = input.files?.[0]; if (file) void uploadImage(file).finally(() => { input.value = ""; }); }} />
            <span className={styles.uploadIcon}>{uploading && uploadProgress?.kind === "image" ? "…" : "+"}</span>
            <strong>{uploading && uploadProgress?.kind === "image" ? (ar ? "جارٍ رفع الصورة…" : "Uploading image…") : (ar ? "اختر صورة من جهازك" : "Choose an image from your device")}</strong>
            <small>{ar ? "JPG أو PNG أو WebP · حتى 25 ميجابايت" : "JPG, PNG, or WebP · up to 25 MB"}</small>
          </label>
          {renderUploadProgress("image")}
        </section>
      </div>

      <section className={styles.panel + " " + styles.selectedPanel}>
        <div className={styles.panelHead}><div><div className={styles.kicker}>03 / YOUR SELECTION</div><h2>{ar ? "قائمة الهيرو وترتيبها" : "Hero selection and order"}</h2><p>{ar ? "استخدم الأسهم لترتيب العناصر. إخفاء عنصر لا يغيّر نشر العمل الأصلي." : "Use the arrows to reorder items. Hiding an item does not unpublish the original work."}</p></div><span className={styles.count}>{sortedItems.filter((item) => item.is_active).length} / {sortedItems.length}</span></div>
        {loading ? <div className={styles.empty}>{ar ? "جارٍ تحميل القائمة…" : "Loading selection…"}</div> : sortedItems.length === 0 ? <div className={styles.empty}>{ar ? "لسه مفيش عناصر مختارة. أضف فيديو أو صورة من القسمين أعلاه." : "No selections yet. Add a video or image above."}</div> : <div className={styles.selectedList}>
          {sortedItems.map((item, index) => <article className={styles.selectedRow + (item.is_active ? "" : " " + styles.inactive)} key={item.id}>
            <span className={styles.order}>{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.thumb}>{item.thumbnail_url ? <img src={item.thumbnail_url} alt="" /> : item.media_type === "video" ? <span>▶</span> : <span>▧</span>}</div>
            <div className={styles.selectedCopy}><strong>{item.title}</strong><small>{item.media_type === "video" ? (ar ? "فيديو" : "VIDEO") : (ar ? "صورة" : "IMAGE")} · {item.is_active ? (ar ? "نشط" : "ACTIVE") : (ar ? "مخفي" : "HIDDEN")}</small></div>
            <div className={styles.rowActions}>
              <button type="button" onClick={() => void moveItem(item.id, -1)} disabled={index === 0 || busyId !== null} aria-label={ar ? "تحريك لأعلى" : "Move up"}>↑</button>
              <button type="button" onClick={() => void moveItem(item.id, 1)} disabled={index === sortedItems.length - 1 || busyId !== null} aria-label={ar ? "تحريك لأسفل" : "Move down"}>↓</button>
              <button type="button" onClick={() => void toggleItem(item)} disabled={busyId === item.id}>{item.is_active ? (ar ? "إخفاء" : "Hide") : (ar ? "إظهار" : "Show")}</button>
              <button type="button" onClick={() => void removeItem(item)} disabled={busyId === item.id}>{ar ? "إزالة" : "Remove"}</button>
            </div>
          </article>)}
        </div>}
      </section>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowDownUp, Search } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import styles from "./StudioWorkManager.module.css";

type Work = {
  id: number;
  series_id: number | null;
  title: string;
  description: string | null;
  content_type: string | null;
  quality: string | null;
  published: boolean | null;
  visibility: string | null;
  video_url: string | null;
  views: number | null;
  likes: number | null;
  created_at: string | null;
};

type Props = {
  works: Work[];
  locale: "ar" | "en";
  creatorId: number;
  resultCount: number;
  totalWorksCount: number;
  filters: { search: string; status: StatusFilter; type: TypeFilter; sort: SortMode };
};
type StatusFilter = "all" | "published" | "draft";
type TypeFilter = "all" | "short" | "video" | "podcast" | "documentary" | "short_film" | "film" | "series";
type SortMode = "newest" | "views" | "likes" | "title";

type StudioAction = "save" | "publish" | "unpublish" | "delete";

function studioActionError(ar: boolean, action: StudioAction) {
  const messages: Record<StudioAction, { ar: string; en: string }> = {
    save: {
      ar: "تعذّر حفظ تعديلات العمل. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.",
      en: "Could not save these changes. Check your connection and permissions, then try again.",
    },
    publish: {
      ar: "تعذّر نشر العمل. راجع بياناته وإعدادات الوصول ثم حاول مجددًا.",
      en: "Could not publish this work. Check its metadata and access settings, then try again.",
    },
    unpublish: {
      ar: "تعذّر إخفاء العمل. تحقق من الاتصال ثم حاول مجددًا.",
      en: "Could not unpublish this work. Check your connection, then try again.",
    },
    delete: {
      ar: "تعذّر حذف العمل. تحقق من الاتصال والصلاحيات ثم حاول مجددًا.",
      en: "Could not delete this work. Check your connection and permissions, then try again.",
    },
  };
  return ar ? messages[action].ar : messages[action].en;
}

const allowedContentTypes = new Set(["short", "video", "podcast", "documentary", "short_film", "film", "series"]);
const allowedVisibility = new Set(["public", "followers", "unlisted", "private", "custom"]);

function isPublishable(work: Work) {
  return Boolean(work.title.trim() && work.video_url?.trim() && allowedContentTypes.has(work.content_type || "video"));
}

function visibilityLabel(value: string | null, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    public: ["عام", "PUBLIC"],
    followers: ["المتابعون", "FOLLOWERS"],
    unlisted: ["بالرابط", "UNLISTED"],
    private: ["خاص", "PRIVATE"],
    custom: ["مخصص", "CUSTOM"],
  };
  const pair = labels[value || "public"] || labels.public;
  return ar ? pair[0] : pair[1];
}

function contentTypeLabel(value: string | null, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    short: ["شورت", "SHORT"],
    video: ["فيديو", "VIDEO"],
    podcast: ["بودكاست", "PODCAST"],
    documentary: ["وثائقي", "DOCUMENTARY"],
    short_film: ["فيلم قصير", "SHORT FILM"],
    film: ["فيلم مطوّل", "FEATURE FILM"],
    series: ["حلقة مسلسل", "SERIES EPISODE"],
  };
  const label = labels[value || "video"] || labels.video;
  return ar ? label[0] : label[1];
}

export default function StudioWorkManager({ works: initialWorks, locale, creatorId, resultCount, totalWorksCount, filters }: Props) {
  const ar = locale === "ar";
  const router = useRouter();
  const works = initialWorks;
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editType, setEditType] = useState("video");
  const [editQuality, setEditQuality] = useState("1080p");
  const [editVisibility, setEditVisibility] = useState("public");
  const [error, setError] = useState("");

  function beginEdit(work: Work) {
    setEditingId(work.id);
    setEditTitle(work.title);
    setEditDescription(work.description || "");
    setEditType(work.content_type || "video");
    setEditQuality(work.quality || "1080p");
    setEditVisibility(work.visibility || "public");
    setError("");
  }

  async function saveEdit(id: number) {
    if (!editTitle.trim()) {
      setError(ar ? "العنوان مطلوب." : "Title is required.");
      return;
    }
    if (!allowedContentTypes.has(editType)) {
      setError(ar ? "نوع المحتوى غير صالح." : "Invalid content type.");
      return;
    }

    // A series episode carries series_id, season_number, and episode_number.
    // Do not convert ordinary works into series, or detach a series episode
    // from that structure through this metadata-only editor.
    const originalWork = works.find((work) => work.id === id);
    const originalType = originalWork?.content_type || "video";
    if ((originalType === "series" || editType === "series") && originalType !== editType) {
      setError(
        ar
          ? "لا يمكن تغيير نوع العمل إلى مسلسل أو إلغاء تصنيفه كمسلسل من شاشة التعديل؛ للحفاظ على ارتباط الحلقة بالمسلسل والموسم ورقم الحلقة."
          : "A work cannot be converted into or out of a series from this editor because its series, season, and episode relationship must remain intact.",
      );
      return;
    }

    if (!allowedVisibility.has(editVisibility)) {
      setError(ar ? "إعداد الظهور غير صالح." : "Invalid visibility setting.");
      return;
    }

    setBusyId(id);
    setError("");
    try {
      const supabase = createClient();
      const { data, error: updateError } = await supabase
        .from("videos")
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          content_type: editType,
          quality: editQuality,
          visibility: editVisibility,
        })
        .eq("id", id)
        .select("id,series_id,title,description,content_type,quality,published,visibility,video_url,views,likes,created_at")
        .single();

      if (updateError || !data) {
        setError(studioActionError(ar, "save"));
      } else {
        // Metadata edits can change an episode's visibility, so the parent
        // series must be synchronized just like it is during publish/unpublish.
        if (originalType === "series" && originalWork?.series_id) {
          const { data: publicEpisodes, error: publicEpisodesError } = await supabase
            .from("videos")
            .select("id")
            .eq("series_id", originalWork.series_id)
            .eq("content_type", "series")
            .eq("published", true)
            .eq("visibility", "public")
            .limit(1);

          if (publicEpisodesError) {
            const { error: restoreError } = await supabase.from("videos").update({
              title: originalWork.title,
              description: originalWork.description,
              content_type: originalType,
              quality: originalWork.quality,
              visibility: originalWork.visibility || "public",
            }).eq("id", id);
            setError(studioActionError(ar, "save") + (restoreError
              ? (ar ? " تعذّر التراجع عن تعديل الحلقة؛ راجع حالة العمل قبل المتابعة." : " The previous episode settings could not be restored; review the work before continuing.")
              : ""));
            return;
          }

          const hasPublicEpisode = Boolean(publicEpisodes?.length);
          const { data: updatedSeries, error: seriesUpdateError } = await supabase
            .from("ravine_series_titles")
            .update({
              published: hasPublicEpisode,
              ...(hasPublicEpisode ? { visibility: "public" } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", originalWork.series_id)
            .eq("creator_id", creatorId)
            .select("id")
            .maybeSingle();

          if (seriesUpdateError || !updatedSeries) {
            const { error: restoreError } = await supabase.from("videos").update({
              title: originalWork.title,
              description: originalWork.description,
              content_type: originalType,
              quality: originalWork.quality,
              visibility: originalWork.visibility || "public",
            }).eq("id", id);
            setError(studioActionError(ar, "save") + (restoreError
              ? (ar ? " تعذّر التراجع عن تعديل الحلقة؛ راجع حالة العمل قبل المتابعة." : " The previous episode settings could not be restored; review the work before continuing.")
              : ""));
            return;
          }
        }

        setEditingId(null);
        router.refresh();
      }
    } catch {
      setError(studioActionError(ar, "save"));
    } finally {
      setBusyId(null);
    }
  }

  async function togglePublished(work: Work) {
    const nextPublished = !work.published;
    if (nextPublished && !isPublishable(work)) {
      setError(
        ar
          ? "لا يمكن نشر العمل قبل التأكد من وجود عنوان وملف وسائط صالح ونوع محتوى صحيح."
          : "This work cannot be published until it has a title, a media source, and a valid content type.",
      );
      return;
    }

    setBusyId(work.id);
    setError("");
    try {
      const response = await fetch("/api/studio/publish-work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          videoId: work.id,
          published: nextPublished,
          visibility: work.visibility || "public",
        }),
      });
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        work?: Work;
      };

      if (!response.ok || !payload.ok || !payload.work) {
        throw new Error("RAVINE_STUDIO_PUBLISH_STATE_FAILED");
      }

      router.refresh();
    } catch {
      setError(studioActionError(ar, nextPublished ? "publish" : "unpublish"));
    } finally {
      setBusyId(null);
    }
  }

  async function removeWork(work: Work) {
    const confirmed = window.confirm(
      ar ? `حذف العمل «${work.title}» نهائيًا؟` : `Delete “${work.title}” permanently?`,
    );
    if (!confirmed) return;

    setBusyId(work.id);
    setError("");

    try {
      const response = await fetch("/api/studio/delete-work", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ videoId: work.id }),
      });
      const payload = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string; code?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.code === "RAVINE_WORK_HAS_FINANCIAL_RECORDS"
          ? "RAVINE_WORK_HAS_FINANCIAL_RECORDS"
          : "RAVINE_STUDIO_DELETE_FAILED");
      }
      router.refresh();
    } catch (deleteError) {
      if (deleteError instanceof Error && deleteError.message === "RAVINE_WORK_HAS_FINANCIAL_RECORDS") {
        setError(ar
          ? "لا يمكن حذف هذا العمل نهائيًا لوجود سجل مالي مرتبط به. استخدم «إخفاء» بدلًا من الحذف."
          : "This work has retained financial records and cannot be permanently deleted. Use “Unpublish” to hide it instead.");
      } else {
        setError(studioActionError(ar, "delete"));
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="studio-works">
      <div className="section-head">
        <div>
          <div className="eyebrow">RAVINE / WORKS</div>
          <h2>{ar ? "إدارة أعمالك" : "Manage your work"}</h2>
          <p className="section-note">{ar ? "عدّل البيانات، غيّر الظهور، انشر العمل أو أخفِه، أو احذفه." : "Edit metadata, change visibility, publish or hide a work, or remove it."}</p>
        </div>
      </div>

      {error ? <div className="empty-state"><strong>{ar ? "حدث خطأ." : "Something went wrong."}</strong><span>{error}</span></div> : null}

      <form
        key={`${filters.search}|${filters.status}|${filters.type}|${filters.sort}`}
        className={styles.discovery}
        action={`/${locale}/studio`}
        method="get"
      >
        <input type="hidden" name="creatorId" value={creatorId} />
        <input type="hidden" name="workPage" value="1" />
        <label className={styles.search}>
          <Search size={16} aria-hidden="true" />
          <input type="search" name="workSearch" defaultValue={filters.search} maxLength={100}
            placeholder={ar ? "ابحث في أعمالك..." : "Search your work..."}
            aria-label={ar ? "البحث في أعمالك" : "Search your work"} />
        </label>
        <label className={styles.filter}>
          <span>{ar ? "الحالة" : "Status"}</span>
          <select name="workStatus" defaultValue={filters.status} aria-label={ar ? "تصفية حسب حالة النشر" : "Filter by publishing status"}>
            <option value="all">{ar ? "كل الحالات" : "All statuses"}</option>
            <option value="published">{ar ? "منشور" : "Published"}</option>
            <option value="draft">{ar ? "مسودات" : "Drafts"}</option>
          </select>
        </label>
        <label className={styles.filter}>
          <span>{ar ? "النوع" : "Format"}</span>
          <select name="workType" defaultValue={filters.type} aria-label={ar ? "تصفية حسب نوع المحتوى" : "Filter by format"}>
            <option value="all">{ar ? "كل الأنواع" : "All formats"}</option>
            <option value="short">{ar ? "شورتات" : "Shorts"}</option>
            <option value="video">{ar ? "فيديو" : "Video"}</option>
            <option value="podcast">{ar ? "بودكاست" : "Podcast"}</option>
            <option value="documentary">{ar ? "وثائقي" : "Documentary"}</option>
            <option value="short_film">{ar ? "فيلم قصير" : "Short film"}</option>
            <option value="film">{ar ? "فيلم مطوّل" : "Feature film"}</option>
            <option value="series">{ar ? "حلقات المسلسلات" : "Series episodes"}</option>
          </select>
        </label>
        <label className={styles.filter}>
          <ArrowDownUp size={14} aria-hidden="true" />
          <span>{ar ? "الترتيب" : "Sort"}</span>
          <select name="workSort" defaultValue={filters.sort} aria-label={ar ? "ترتيب الأعمال" : "Sort work"}>
            <option value="newest">{ar ? "الأحدث" : "Newest"}</option>
            <option value="views">{ar ? "الأكثر مشاهدة" : "Most viewed"}</option>
            <option value="likes">{ar ? "الأكثر إعجابًا" : "Most liked"}</option>
            <option value="title">{ar ? "العنوان أبجديًا" : "Title A–Z"}</option>
          </select>
        </label>
        <div className={styles.count} role="status" aria-live="polite">
          <strong>{resultCount.toLocaleString(ar ? "ar-EG" : "en-US")}</strong>
          <span>{ar ? "عمل مطابق" : "matching works"}</span>
          <button className={styles.applyFilters} type="submit">{ar ? "تطبيق" : "Apply"}</button>
          {(filters.search || filters.status !== "all" || filters.type !== "all" || filters.sort !== "newest") ? (
            <Link className={styles.resetFilters} href={`/${locale}/studio?creatorId=${creatorId}`}>{ar ? "إلغاء التصفية" : "Reset filters"}</Link>
          ) : null}
        </div>
      </form>

      {works.length === 0 ? (
        <div className={styles.noResults} role="status">
          <strong>{totalWorksCount === 0 && !filters.search && filters.status === "all" && filters.type === "all"
            ? (ar ? "لا توجد أعمال بعد." : "No works yet.")
            : (ar ? "لا توجد أعمال مطابقة." : "No matching work.")}</strong>
          <span>{totalWorksCount === 0 && !filters.search && filters.status === "all" && filters.type === "all"
            ? (ar ? "استخدم النموذج أعلاه لإضافة أول عمل." : "Use the upload form above to add your first work.")
            : (ar ? "جرّب تغيير البحث أو المرشحات." : "Try changing your search or filters.")}</span>
          {(filters.search || filters.status !== "all" || filters.type !== "all" || filters.sort !== "newest") ? (
            <Link className={styles.resetFilters} href={`/${locale}/studio?creatorId=${creatorId}`}>{ar ? "عرض كل الأعمال" : "Show all work"}</Link>
          ) : null}
        </div>
      ) : null}

      <div className="studio-work-list">
        {works.map((work) => {
          const editing = editingId === work.id;
          const busy = busyId === work.id;
          const publishBlocked = !work.published && !isPublishable(work);
          return (
            <article className="studio-work-row" key={work.id}>
              <div className="studio-work-main">
                <div className="video-kicker">
                  {work.published ? (ar ? "منشور" : "PUBLISHED") : (ar ? "مسودة" : "DRAFT")}
                  {work.published && work.visibility ? ` · ${visibilityLabel(work.visibility, ar)}` : ""}
                  {` · ${contentTypeLabel(work.content_type || "video", ar)} · ${work.quality || "1080p"}`}
                </div>
                {editing ? (
                  <div className="studio-inline-form">
                    <input value={editTitle} onChange={(event) => setEditTitle(event.target.value)} placeholder={ar ? "العنوان" : "Title"} />
                    <textarea value={editDescription} onChange={(event) => setEditDescription(event.target.value)} rows={3} placeholder={ar ? "الوصف" : "Description"} />
                    <div className="studio-form-grid">
                      <select value={editType} disabled={work.content_type === "series"} onChange={(event) => setEditType(event.target.value)}>
                        <option value="short">{ar ? "شورتات" : "Shorts"}</option>
                        <option value="video">{ar ? "فيديو" : "Video"}</option>
                        <option value="podcast">{ar ? "بودكاست" : "Podcast"}</option>
                        <option value="documentary">{ar ? "وثائقي" : "Documentary"}</option>
                        <option value="short_film">{ar ? "فيلم قصير" : "Short Film"}</option>
                        <option value="film">{ar ? "فيلم مطوّل" : "Feature Film"}</option>
                        <option value="series" disabled={work.content_type !== "series"}>{ar ? "مسلسل / حلقة" : "Series episode"}</option>
                      </select>
                      <select value={editQuality} onChange={(event) => setEditQuality(event.target.value)}>
                        <option value="720p">720p</option>
                        <option value="1080p">1080p</option>
                        <option value="2k">2K</option>
                        <option value="4k">4K</option>
                      </select>
                      <select value={editVisibility} onChange={(event) => setEditVisibility(event.target.value)}>
                        <option value="public">{ar ? "عام" : "Public"}</option>
                        <option value="followers">{ar ? "المتابعون" : "Followers"}</option>
                        <option value="unlisted">{ar ? "بالرابط" : "Unlisted"}</option>
                        <option value="private">{ar ? "خاص" : "Private"}</option>
                        <option value="custom">{ar ? "جمهور مخصص" : "Custom audience"}</option>
                      </select>
                    </div>
                    <div className="studio-work-actions">
                      <button className="button primary" type="button" onClick={() => void saveEdit(work.id)} disabled={busy}>{ar ? "حفظ" : "Save"}</button>
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
                  <Link className="button secondary" href={"/" + locale + "/watch/" + work.id}>{ar ? "معاينة" : "Preview"}</Link>
                  <button className="button secondary" type="button" onClick={() => beginEdit(work)} disabled={busy}>{ar ? "تعديل" : "Edit"}</button>
                  <button className="button secondary" type="button" onClick={() => void togglePublished(work)} disabled={busy || publishBlocked}>{busy ? "…" : work.published ? (ar ? "إخفاء" : "Unpublish") : (ar ? "نشر" : "Publish")}</button>
                  <button className="button secondary" type="button" onClick={() => void removeWork(work)} disabled={busy}>{ar ? "حذف" : "Delete"}</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}

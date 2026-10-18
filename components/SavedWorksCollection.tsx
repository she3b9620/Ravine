"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, BookmarkMinus, Search, X } from "lucide-react";
import { removeSavedVideo } from "@/app/actions/ravine-social";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "./SavedWorksCollection.module.css";

export type SavedWorkItem = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  content_type: string | null;
  quality: string | null;
  created_at: string | null;
};

type SortMode = "newest" | "views" | "likes" | "title";
type Props = {
  locale: "ar" | "en";
  initialItems: SavedWorkItem[];
  loadError?: boolean;
};

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remaining).padStart(2, "0")
    : minutes + ":" + String(remaining).padStart(2, "0");
}

function typeLabel(type: string | null, ar: boolean) {
  const labels: Record<string, [string, string]> = {
    short: ["شورت", "SHORT"],
    video: ["فيديو", "VIDEO"],
    podcast: ["بودكاست", "PODCAST"],
    documentary: ["وثائقي", "DOCUMENTARY"],
    short_film: ["فيلم قصير", "SHORT FILM"],
    film: ["فيلم مطوّل", "FEATURE FILM"],
    series: ["حلقة مسلسل", "SERIES EPISODE"],
    live: ["بث مباشر", "LIVE"],
  };
  const pair = labels[type || "video"] || labels.video;
  return ar ? pair[0] : pair[1];
}

export default function SavedWorksCollection({ locale, initialItems, loadError: initialLoadError = false }: Props) {
  const ar = locale === "ar";
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const visibleItems = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    const filtered = items.filter((item) => !normalized || [
      item.title || "",
      item.description || "",
      typeLabel(item.content_type, ar),
      item.quality || "",
    ].join(" ").toLocaleLowerCase(locale).includes(normalized));

    return filtered.sort((left, right) => {
      if (sortMode === "views") return Number(right.views || 0) - Number(left.views || 0);
      if (sortMode === "likes") return Number(right.likes || 0) - Number(left.likes || 0);
      if (sortMode === "title") return (left.title || "").localeCompare(right.title || "", locale, { sensitivity: "base" });
      return (Date.parse(right.created_at || "") || 0) - (Date.parse(left.created_at || "") || 0);
    });
  }, [items, query, sortMode, locale, ar]);

  async function removeSavedItem(workId: number) {
    if (busyId !== null) return;
    setBusyId(workId);
    setError("");
    setAnnouncement("");
    try {
      const result = await removeSavedVideo(workId);
      if (!result.ok) {
        const copy = result.code === "AUTH_REQUIRED"
          ? (ar ? "انتهت جلسة الدخول. سجّل الدخول مجددًا." : "Your session has expired. Please sign in again.")
          : result.code === "INVALID_INPUT"
            ? (ar ? "تعذر تحديد العمل المطلوب." : "The selected work is invalid.")
            : (ar ? "تعذر حذف العمل من المحفوظات. حاول مرة أخرى." : "The work could not be removed. Please try again.");
        setError(copy);
        return;
      }
      setItems((current) => current.filter((item) => item.id !== workId));
      setAnnouncement(ar ? "تم حذف العمل من المحفوظات." : "Work removed from saved items.");
    } catch {
      setError(ar ? "تعذر حذف العمل من المحفوظات. حاول مرة أخرى." : "The work could not be removed. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (initialLoadError) {
    return (
      <div className={styles.notice} role="alert">
        <strong>{ar ? "تعذر تحميل المحفوظات." : "Saved works could not be loaded."}</strong>
        <span>{ar ? "تحقق من اتصالك ثم أعد تحميل الصفحة." : "Check your connection and reload the page."}</span>
      </div>
    );
  }

  return (
    <div className={styles.collection}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{ar ? "البحث في المحفوظات" : "Search saved work"}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={ar ? "البحث في المحفوظات" : "Search saved work"}
            placeholder={ar ? "ابحث في العناوين والأوصاف..." : "Search titles and descriptions..."}
          />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label={ar ? "مسح البحث" : "Clear search"}><X size={15} /></button> : null}
        </label>
        <label className={styles.sort}>
          <ArrowDownUp size={15} aria-hidden="true" />
          <span>{ar ? "ترتيب" : "Sort"}</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label={ar ? "ترتيب المحفوظات" : "Sort saved work"}>
            <option value="newest">{ar ? "الأحدث أولًا" : "Newest first"}</option>
            <option value="views">{ar ? "الأكثر مشاهدة" : "Most viewed"}</option>
            <option value="likes">{ar ? "الأكثر إعجابًا" : "Most liked"}</option>
            <option value="title">{ar ? "العنوان أبجديًا" : "Title A–Z"}</option>
          </select>
        </label>
        <div className={styles.count} role="status" aria-live="polite">
          <strong>{formatRavineNumber(visibleItems.length, locale)}</strong>
          <span>{ar ? "عمل محفوظ" : "saved works"}</span>
        </div>
      </div>

      {error ? <div className={styles.inlineError} role="alert">{error}</div> : null}
      {announcement ? <p className={styles.announcement} role="status">{announcement}</p> : null}

      {items.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><BookmarkMinus size={20} aria-hidden="true" /></div>
          <strong>{ar ? "لا توجد أعمال محفوظة ظاهرة." : "No saved public works yet."}</strong>
          <span>{ar ? "احفظ الأعمال من صفحة المشاهدة وستجدها هنا." : "Save works from their viewing page and find them here."}</span>
          <Link href={"/" + locale + "/discover"} className="button secondary">{ar ? "اكتشف الأعمال" : "Discover work"}</Link>
        </div>
      ) : visibleItems.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}><Search size={20} aria-hidden="true" /></div>
          <strong>{ar ? "لا توجد نتائج مطابقة." : "No matching works."}</strong>
          <span>{ar ? "جرّب كلمة بحث مختلفة." : "Try another search term."}</span>
          {query ? <button type="button" onClick={() => setQuery("")}>{ar ? "عرض كل الأعمال" : "Show all works"}</button> : null}
        </div>
      ) : (
        <div className="video-grid">
          {visibleItems.map((work) => (
            <article className="video-card" key={work.id}>
              <Link href={"/" + locale + "/watch/" + work.id} className={styles.workLink}>
                <div className="video-thumb">
                  <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                  {work.duration ? <span className="duration">{durationLabel(work.duration)}</span> : null}
                </div>
                <div className="video-meta">
                  <div className="video-kicker">{typeLabel(work.content_type, ar)}{work.quality ? " · " + work.quality : ""}</div>
                  <h2>{work.title || (ar ? "بدون عنوان" : "Untitled work")}</h2>
                  <p>{work.description || (ar ? "عمل إبداعي من مجتمع رَافِين." : "A creative work from RAVINE creators.")}</p>
                  <div className="video-stats">
                    <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
                    <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
                  </div>
                </div>
              </Link>
              <div className={styles.cardActions}>
                <span>{ar ? "محفوظ" : "Saved"}</span>
                <button type="button" aria-label={ar ? "إزالة " + (work.title || "العمل") + " من المحفوظات" : "Remove " + (work.title || "work") + " from saved items"} onClick={() => void removeSavedItem(work.id)} disabled={busyId !== null}>
                  {busyId === work.id ? "…" : (ar ? "إزالة من المحفوظات" : "Remove saved item")}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

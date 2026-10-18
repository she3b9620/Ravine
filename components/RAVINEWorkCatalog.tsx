"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, Clapperboard, Film, Mic2, Play, Search, Tv, X } from "lucide-react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "./RAVINEWorkCatalog.module.css";

export type RAVINECatalogBadgeIcon = "podcast" | "film" | "short-film" | "series" | "episode";
export type RAVINECatalogTone = "podcast" | "series";
export type RAVINECatalogItem = {
  id: number | string;
  href: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  createdAt: string | null;
  badge: string;
  kicker?: string;
  badgeIcon?: RAVINECatalogBadgeIcon;
  badgeTone?: RAVINECatalogTone;
  badgeClassName?: string;
  cardClassName?: string;
  primaryMetric?: string;
  secondaryMetric?: string;
};
type Props = { locale: "ar" | "en"; items: RAVINECatalogItem[] };
type SortMode = "newest" | "views" | "likes" | "title";

function durationLabel(seconds: number | null) {
  if (!seconds || seconds < 1) return "—";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remaining = total % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`
    : `${minutes}:${String(remaining).padStart(2, "0")}`;
}
const badgeIcons = { podcast: Mic2, film: Clapperboard, "short-film": Film, series: Tv, episode: Play } as const;

export default function RAVINEWorkCatalog({ locale, items }: Props) {
  const ar = locale === "ar";
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const visibleItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase(locale);
    const matches = items.filter((item) => !normalizedQuery || [
      item.title, item.description || "", item.badge, item.kicker || "", item.quality || "",
    ].join(" ").toLocaleLowerCase(locale).includes(normalizedQuery));
    return matches.sort((left, right) => {
      if (sort === "views") return Number(right.views || 0) - Number(left.views || 0);
      if (sort === "likes") return Number(right.likes || 0) - Number(left.likes || 0);
      if (sort === "title") return left.title.localeCompare(right.title, locale, { sensitivity: "base" });
      return (Date.parse(right.createdAt || "") || 0) - (Date.parse(left.createdAt || "") || 0);
    });
  }, [items, locale, query, sort]);

  const sortLabel = ar ? "ترتيب الأعمال" : "Sort work";
  return (
    <div className={styles.catalog}>
      <div className={styles.controls}>
        <label className={styles.searchControl}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{ar ? "البحث في الأعمال" : "Search works"}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)}
            placeholder={ar ? "ابحث بالعنوان أو الوصف..." : "Search by title or description..."}
            aria-label={ar ? "البحث في الأعمال" : "Search works"} />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label={ar ? "مسح البحث" : "Clear search"}><X size={15} /></button> : null}
        </label>
        <label className={styles.sortControl}>
          <ArrowDownUp size={15} aria-hidden="true" /><span>{sortLabel}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label={sortLabel}>
            <option value="newest">{ar ? "الأحدث أولًا" : "Newest first"}</option>
            <option value="views">{ar ? "الأكثر مشاهدة" : "Most viewed"}</option>
            <option value="likes">{ar ? "الأكثر إعجابًا" : "Most liked"}</option>
            <option value="title">{ar ? "العنوان أبجديًا" : "Title A–Z"}</option>
          </select>
        </label>
        <div className={styles.resultCount} role="status" aria-live="polite">
          <strong>{formatRavineNumber(visibleItems.length, locale)}</strong><span>{ar ? "عمل ظاهر" : "works shown"}</span>
        </div>
      </div>
      {visibleItems.length === 0 ? (
        <div className={styles.noResults} role="status">
          <div className={styles.noResultsIcon}><Search size={19} aria-hidden="true" /></div>
          <strong>{ar ? "لا توجد أعمال مطابقة." : "No matching works."}</strong>
          <span>{ar ? "جرّب كلمة بحث مختلفة أو امسح البحث لعرض كل الأعمال." : "Try another search, or clear it to see every work."}</span>
          {query ? <button type="button" onClick={() => setQuery("")}>{ar ? "عرض كل الأعمال" : "Show all works"}</button> : null}
        </div>
      ) : (
        <div className="video-grid ravine-documentaries-grid">
          {visibleItems.map((work) => {
            const Icon = work.badgeIcon ? badgeIcons[work.badgeIcon] : null;
            const toneClass = work.badgeTone === "series" ? styles.seriesBadge : work.badgeTone === "podcast" ? styles.podcastBadge : "";
            return (
              <Link href={work.href} className={`video-card ${work.cardClassName || ""}`.trim()} key={work.id}>
                <div className="video-thumb">
                  <img src={work.imageUrl || "/RAVINE.PNG"} alt="" loading="lazy" />
                  {work.duration !== null ? <span className="duration">{durationLabel(work.duration)}</span> : null}
                  <span className={`documentary-pill ${styles.badge} ${toneClass} ${work.badgeClassName || ""}`.trim()}>
                    {Icon ? <Icon size={12} strokeWidth={1.8} aria-hidden="true" /> : null}{work.badge}
                  </span>
                </div>
                <div className="video-meta">
                  <div className="video-kicker">{work.kicker || work.badge.toUpperCase()}{work.quality ? ` · ${work.quality}` : ""}</div>
                  <h2>{work.title || (ar ? "بدون عنوان" : "Untitled")}</h2>
                  <p>{work.description || (ar ? "عمل من مجتمع رَافِين." : "A work from the RAVINE community.")}</p>
                  <div className="video-stats">
                    <span>{work.primaryMetric || `${formatRavineNumber(Number(work.views || 0), locale)} ${ar ? "مشاهدة" : "views"}`}</span>
                    <span>{work.secondaryMetric || `${formatRavineNumber(Number(work.likes || 0), locale)} ${ar ? "إعجاب" : "likes"}`}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

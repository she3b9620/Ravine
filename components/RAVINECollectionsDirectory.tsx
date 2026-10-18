"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowDownUp, BookmarkPlus, Eye, LockKeyhole, Search, X } from "lucide-react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "./RAVINECollectionsDirectory.module.css";

export type RAVINECollectionDirectoryItem = {
  id: string;
  title: string;
  description: string | null;
  visibility: string;
  createdAt: string;
  owned: boolean;
  itemCount: number;
};
type Locale = "ar" | "en";
type VisibilityFilter = "all" | "public" | "private" | "members";
type SortMode = "newest" | "oldest" | "works" | "title";

const copy = {
  ar: {
    search: "ابحث عن مجموعة أو فكرة...",
    filter: "عرض",
    all: "الكل",
    public: "عامة",
    private: "خاصة",
    members: "الأعضاء",
    sort: "ترتيب",
    newest: "الأحدث أولًا",
    oldest: "الأقدم أولًا",
    works: "الأكثر أعمالًا",
    title: "العنوان أبجديًا",
    mine: "مجموعتك",
    community: "مجموعة عامة",
    publicBadge: "عامة",
    privateBadge: "خاصة",
    memberBadge: "الأعضاء فقط",
    work: "عمل",
    empty: "لا توجد مجموعات مطابقة.",
    emptyHelp: "جرّب كلمة أخرى أو غيّر نوع العرض.",
    clear: "عرض الكل",
  },
  en: {
    search: "Search collections or ideas...",
    filter: "View",
    all: "All",
    public: "Public",
    private: "Private",
    members: "Members",
    sort: "Sort",
    newest: "Newest first",
    oldest: "Oldest first",
    works: "Most works",
    title: "Title A–Z",
    mine: "YOUR COLLECTION",
    community: "PUBLIC COLLECTION",
    publicBadge: "Public",
    privateBadge: "Private",
    memberBadge: "Members only",
    work: "works",
    empty: "No matching collections.",
    emptyHelp: "Try another term or choose a different visibility filter.",
    clear: "Show all",
  },
} as const;

export default function RAVINECollectionsDirectory({
  locale,
  collections,
}: {
  locale: Locale;
  collections: RAVINECollectionDirectoryItem[];
}) {
  const ar = locale === "ar";
  const t = copy[locale];
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<VisibilityFilter>("all");
  const [sort, setSort] = useState<SortMode>("newest");

  const counts = useMemo(() => ({
    all: collections.length,
    public: collections.filter((item) => item.visibility === "public").length,
    private: collections.filter((item) => item.visibility === "private" && item.owned).length,
    members: collections.filter((item) => item.visibility === "members" && item.owned).length,
  }), [collections]);

  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale);
    return collections.filter((item) => {
      if (visibility === "public" && item.visibility !== "public") return false;
      if (visibility === "private" && !(item.owned && item.visibility === "private")) return false;
      if (visibility === "members" && !(item.owned && item.visibility === "members")) return false;
      if (!normalized) return true;
      return [item.title, item.description || ""].join(" ").toLocaleLowerCase(locale).includes(normalized);
    }).sort((left, right) => {
      if (sort === "oldest") return (Date.parse(left.createdAt) || 0) - (Date.parse(right.createdAt) || 0);
      if (sort === "works") return right.itemCount - left.itemCount;
      if (sort === "title") return left.title.localeCompare(right.title, locale, { sensitivity: "base" });
      return (Date.parse(right.createdAt) || 0) - (Date.parse(left.createdAt) || 0);
    });
  }, [collections, locale, query, visibility, sort]);

  const filters: Array<{ id: VisibilityFilter; label: string; count: number }> = [
    { id: "all", label: t.all, count: counts.all },
    { id: "public", label: t.public, count: counts.public },
    { id: "private", label: t.private, count: counts.private },
    { id: "members", label: t.members, count: counts.members },
  ];

  return (
    <div className={styles.directory}>
      <div className={styles.controls}>
        <label className={styles.search}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>{t.search}</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />
          {query ? <button type="button" onClick={() => setQuery("")} aria-label={ar ? "مسح البحث" : "Clear search"}><X size={15} /></button> : null}
        </label>
        <label className={styles.sort}>
          <ArrowDownUp size={15} aria-hidden="true" />
          <span>{t.sort}</span>
          <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label={t.sort}>
            <option value="newest">{t.newest}</option>
            <option value="oldest">{t.oldest}</option>
            <option value="works">{t.works}</option>
            <option value="title">{t.title}</option>
          </select>
        </label>
      </div>
      <div className={styles.filters} role="group" aria-label={ar ? "تصفية المجموعات حسب الظهور" : "Filter collections by visibility"}>
        {filters.map((item) => (
          <button key={item.id} type="button" className={styles.filterButton + " " + (visibility === item.id ? styles.active : "")} aria-pressed={visibility === item.id} onClick={() => setVisibility(item.id)}>
            {item.label}<span>{formatRavineNumber(item.count, locale)}</span>
          </button>
        ))}
      </div>
      <div className={styles.count} role="status" aria-live="polite">
        <strong>{formatRavineNumber(visible.length, locale)}</strong>
        <span>{ar ? "مجموعة ظاهرة" : "visible collections"}</span>
      </div>
      {visible.length ? (
        <div className={styles.grid}>
          {visible.map((collection) => {
            const isPublic = collection.visibility === "public";
            const visibilityLabel = isPublic ? t.publicBadge : collection.visibility === "members" ? t.memberBadge : t.privateBadge;
            return (
              <Link className={styles.card} href={"/" + locale + "/collections?id=" + encodeURIComponent(collection.id)} key={collection.id}>
                <div className={styles.cardTop}>
                  <span className={styles.ownership}>{collection.owned ? t.mine : t.community}</span>
                  <span className={styles.visibilityPill}>
                    {isPublic ? <Eye size={12} aria-hidden="true" /> : <LockKeyhole size={12} aria-hidden="true" />}
                    {visibilityLabel}
                  </span>
                </div>
                <h2>{collection.title}</h2>
                <p>{collection.description || (ar ? "مجموعة منتقاة من أعمال رَافِين." : "A curated collection of RAVINE work.")}</p>
                <div className={styles.meta}>
                  <span>{formatRavineNumber(collection.itemCount, locale)} {ar ? "عمل" : "works"}</span>
                  <span>{new Date(collection.createdAt).toLocaleDateString(ar ? "ar-EG" : "en-US")}</span>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon}><BookmarkPlus size={20} aria-hidden="true" /></div>
          <strong>{t.empty}</strong>
          <span>{t.emptyHelp}</span>
          {query || visibility !== "all" ? <button type="button" onClick={() => { setQuery(""); setVisibility("all"); }}>{t.clear}</button> : null}
        </div>
      )}
    </div>
  );
}

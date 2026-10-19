"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDownUp, Search, Users, X } from "lucide-react";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";
import styles from "./RAVINECreatorDirectory.module.css";

export type RAVINECreatorDirectoryItem = {
  id: number;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  specialty: string | null;
  followers: number;
};

type SortMode = "followers" | "name";
type Props = {
  locale: "ar" | "en";
  view: "all" | "following";
  creators: RAVINECreatorDirectoryItem[];
  query: string;
  sort: SortMode;
  page: number;
  pageCount: number;
  totalCount: number;
};

function directoryHref(locale: "ar" | "en", query: string, sort: SortMode, page: number) {
  const params = new URLSearchParams();
  const cleanQuery = query.trim().slice(0, 100).replace(/[(),%_*"\\]/g, " ").replace(/\\s+/g, " ").trim();
  if (cleanQuery) params.set("q", cleanQuery);
  if (sort !== "followers") params.set("sort", sort);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return "/" + locale + "/creators" + (search ? "?" + search : "") + "#creator-directory-results";
}

const copy = {
  ar: {
    search: "ابحث بالاسم أو التخصص أو اسم المستخدم...",
    sort: "ترتيب",
    sortFollowers: "الأكثر متابعة",
    name: "الاسم أبجديًا",
    countAll: "مبدع",
    countFollowing: "مبدع تتابعهم",
    emptyAll: "لا يوجد مبدعون مطابقون.",
    emptyFollowing: "لا تتابع مبدعين بعد.",
    emptyFollowingHelp: "استكشف دليل المبدعين وافتح الملفات التي تهمك ثم تابع أصحابها.",
    emptySearch: "لا توجد نتائج مطابقة.",
    emptySearchHelp: "جرّب كلمة أخرى أو امسح البحث لعرض كل المبدعين في هذا القسم.",
    clear: "عرض الكل",
    apply: "استكشف مسار المبدع",
    followersLabel: "متابع",
  },
  en: {
    search: "Search by name, discipline, or username...",
    sort: "Sort",
    sortFollowers: "Most followed",
    name: "Name A–Z",
    countAll: "creators",
    countFollowing: "followed creators",
    emptyAll: "No matching creators.",
    emptyFollowing: "You do not follow any creators yet.",
    emptyFollowingHelp: "Explore the creator directory, open profiles that interest you, and follow their work.",
    emptySearch: "No matching results.",
    emptySearchHelp: "Try another term or clear your search to see every creator in this view.",
    clear: "Show all",
    apply: "Explore creator pathway",
    followersLabel: "followers",
  },
} as const;

export default function RAVINECreatorDirectory({ locale, view, creators, query: initialQuery, sort: initialSort, page, pageCount, totalCount }: Props) {
  const ar = locale === "ar";
  const t = copy[locale];
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<SortMode>(initialSort);
  const [isPending, startTransition] = useTransition();
  const skipInitialSync = useRef(true);

  useEffect(() => {
    if (view !== "all") return;
    if (skipInitialSync.current) {
      skipInitialSync.current = false;
      return;
    }
    const timeout = window.setTimeout(() => {
      startTransition(() => router.replace(directoryHref(locale, query, sort, 1), { scroll: false }));
    }, 320);
    return () => window.clearTimeout(timeout);
  }, [locale, query, router, sort, startTransition, view]);

  const visibleCreators = useMemo(() => {
    if (view === "all") return creators;
    const normalized = query.trim().toLocaleLowerCase(locale);
    const filtered = creators.filter((creator) => !normalized || [
      creator.name,
      creator.username || "",
      creator.specialty || "",
      creator.bio || "",
    ].join(" ").toLocaleLowerCase(locale).includes(normalized));
    return filtered.sort((left, right) => sort === "name"
      ? left.name.localeCompare(right.name, locale, { sensitivity: "base" })
      : right.followers - left.followers);
  }, [creators, locale, query, sort, view]);

  const emptyTitle = query.trim()
    ? t.emptySearch
    : view === "following"
      ? t.emptyFollowing
      : t.emptyAll;
  const emptyDescription = query.trim()
    ? t.emptySearchHelp
    : view === "following"
      ? t.emptyFollowingHelp
      : (ar ? "سيظهر هنا المبدعون الذين تتوافق أعمالهم مع بحثك." : "Creators whose work matches your path will appear here.");

  return (
    <div className={styles.directory} id="creator-directory-results" aria-busy={view === "all" && isPending}>
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
            <option value="followers">{t.sortFollowers}</option>
            <option value="name">{t.name}</option>
          </select>
        </label>
        <div className={styles.count} role="status" aria-live="polite">
          <strong>{formatRavineNumber(view === "all" ? totalCount : visibleCreators.length, locale)}</strong>
          <span>{view === "following" ? (ar ? "مبدع تتابعهم" : "followed creators") : (ar ? "مبدع" : "creators")}</span>
        </div>
      </div>

      {visibleCreators.length ? (
        <div className="video-grid creators-grid">
          {visibleCreators.map((creator) => (
            <Link href={"/" + locale + "/creators/" + creator.id} className="video-card creator-card" key={creator.id}>
              <div className="video-thumb creator-avatar-wrap">
                <img src={creator.avatarUrl || "/RAVINE.PNG"} alt="" className="creator-avatar" loading="lazy" />
              </div>
              <div className="video-meta">
                <div className="video-kicker">{creator.specialty || "CREATOR"}</div>
                <h2>{creator.name}</h2>
                <p>{creator.bio || (ar ? "ملف إبداعي من مجتمع رَافِين." : "A creative identity from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>@{creator.username || "creator-" + creator.id}</span>
                  <span>{formatRavineNumber(creator.followers, locale)} {t.followersLabel}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.empty} role="status">
          <div className={styles.emptyIcon}><Users size={19} aria-hidden="true" /></div>
          <strong>{emptyTitle}</strong>
          <span>{emptyDescription}</span>
          {query ? <button type="button" onClick={() => setQuery("")}>{t.clear}</button> : null}
          {view === "following" && !creators.length ? <Link href={"/" + locale + "/creators"} className="button secondary">{ar ? "اكتشف المبدعين" : "Explore creators"}</Link> : null}
        </div>
      )}

      {view === "all" && totalCount > 0 ? (
        <p className={styles.paginationSummary} aria-live="polite">
          {ar
            ? `عرض ${formatRavineNumber((page - 1) * 24 + 1, locale)}–${formatRavineNumber(Math.min(page * 24, totalCount), locale)} من ${formatRavineNumber(totalCount, locale)} مبدع`
            : `Showing ${formatRavineNumber((page - 1) * 24 + 1, locale)}–${formatRavineNumber(Math.min(page * 24, totalCount), locale)} of ${formatRavineNumber(totalCount, locale)} creators`}
        </p>
      ) : null}
      {view === "all" && pageCount > 1 ? (
        <nav className={styles.pagination} aria-label={ar ? "صفحات المبدعين" : "Creator pages"}>
          {page > 1
            ? <Link className={styles.pageLink} href={directoryHref(locale, query, sort, page - 1)}>{ar ? "السابق" : "Previous"}</Link>
            : <span className={styles.pageDisabled} aria-disabled="true">{ar ? "السابق" : "Previous"}</span>}
          <span className={styles.pageIndicator} aria-current="page">
            {ar ? `صفحة ${formatRavineNumber(page, locale)} من ${formatRavineNumber(pageCount, locale)}` : `Page ${formatRavineNumber(page, locale)} of ${formatRavineNumber(pageCount, locale)}`}
          </span>
          {page < pageCount
            ? <Link className={styles.pageLink} href={directoryHref(locale, query, sort, page + 1)}>{ar ? "التالي" : "Next"}</Link>
            : <span className={styles.pageDisabled} aria-disabled="true">{ar ? "التالي" : "Next"}</span>}
        </nav>
      ) : null}
    </div>
  );
}

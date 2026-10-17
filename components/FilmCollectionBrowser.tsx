"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, Film, LayoutGrid, Play } from "lucide-react";
import RAVINEWorkPlayer from "@/components/RAVINEWorkPlayer";
import type { RAVINEFilmCollectionItem, RAVINEFilmFormat } from "@/lib/ravine-film-collections";
import { toRAVINEWork } from "@/lib/ravine-work-universe";
import { resolveWorkPlaybackUrl } from "@/lib/ravine-playback-core";
import styles from "./FilmCollectionBrowser.module.css";

type Locale = "ar" | "en";
type ViewMode = "grid" | "feed";

type Props = {
  locale: Locale;
  format: RAVINEFilmFormat;
  items: RAVINEFilmCollectionItem[];
  schemaReady: boolean;
  unclassifiedCount: number;
  loadError: boolean;
};

function formatDuration(seconds: number | null, ar: boolean) {
  if (!seconds || seconds < 1) return ar ? "غير محدد" : "Unspecified";
  const total = Math.round(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  const value = hours > 0
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0")
    : minutes + ":" + String(remainder).padStart(2, "0");
  return value;
}

function FilmCard({ film, locale, format }: { film: RAVINEFilmCollectionItem; locale: Locale; format: RAVINEFilmFormat }) {
  const ar = locale === "ar";
  return (
    <Link href={"/" + locale + "/watch/" + film.id} className="video-card">
      <div className="video-thumb">
        <img src={film.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
        <span className="duration" dir="ltr">{formatDuration(film.duration, ar)}</span>
        <span className={styles.formatPill}>{format === "short_film" ? (ar ? "فيلم قصير" : "Short Film") : (ar ? "فيلم روائي طويل" : "Feature Film")}</span>
      </div>
      <div className="video-meta">
        <div className="video-kicker">
          {format === "short_film" ? "SHORT FILM" : "FEATURE FILM"}{film.quality ? " · " + film.quality : ""}
        </div>
        <h2>{film.title || (ar ? "عمل سينمائي بدون عنوان" : "Untitled film")}</h2>
        <p>{film.description || (ar ? "عمل سينمائي من مجتمع رَافِين." : "A cinematic work from the RAVINE community.")}</p>
        <div className="video-stats">
          <span dir="ltr">{Number(film.views || 0).toLocaleString("en-US")} {ar ? "مشاهدة" : "views"}</span>
          <span dir="ltr">{Number(film.likes || 0).toLocaleString("en-US")} {ar ? "إعجاب" : "likes"}</span>
        </div>
      </div>
    </Link>
  );
}

function FilmFeedItem({ film, locale, order }: { film: RAVINEFilmCollectionItem; locale: Locale; order: number }) {
  const ar = locale === "ar";
  const ref = useRef<HTMLDivElement | null>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const work = useMemo(() => toRAVINEWork({
    id: film.id,
    title: film.title,
    description: film.description,
    thumbnail_url: film.thumbnail_url,
    video_url: film.video_url,
    duration: film.duration,
    content_type: film.content_type,
    work_format: film.work_format,
    published: true,
    visibility: film.visibility || "public",
    discovery_enabled: film.discovery_enabled !== false,
    creator_id: film.creator_id,
  }), [film]);
  const playable = Boolean(resolveWorkPlaybackUrl(work.id, work.mediaUrl));

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setNearViewport(true);
        observer.disconnect();
      }
    }, { root: null, rootMargin: "550px 0px" });

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <article className={styles.feedItem} ref={ref}>
      <div className={styles.feedVisual}>
        {nearViewport && playable ? (
          <div className={styles.feedPlayer}>
            <RAVINEWorkPlayer work={work} locale={locale} />
          </div>
        ) : (
          <Link href={"/" + locale + "/watch/" + film.id} className={styles.feedPoster} aria-label={(ar ? "شاهد " : "Watch ") + (film.title || (ar ? "الفيلم" : "film"))}>
            <img src={film.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
            <span className={styles.feedPosterAction}><Play size={22} fill="currentColor" />{nearViewport && !playable ? (ar ? "افتح صفحة المشاهدة" : "Open watch page") : (ar ? "اضغط لفتح العمل" : "Open work")}</span>
          </Link>
        )}
      </div>
      <div className={styles.feedMeta}>
        <div className={styles.feedIndex}>{String(order + 1).padStart(2, "0")} / RAVINE FILM FEED</div>
        <span className={styles.formatPill}>{ar ? "فيلم قصير" : "Short Film"}</span>
        <h2>{film.title || (ar ? "عمل سينمائي بدون عنوان" : "Untitled short film")}</h2>
        <p>{film.description || (ar ? "عمل سينمائي من مجتمع رَافِين." : "A cinematic work from the RAVINE community.")}</p>
        <div className={styles.feedStats}>
          <span dir="ltr">{formatDuration(film.duration, ar)}</span>
          <span dir="ltr">{Number(film.views || 0).toLocaleString("en-US")} {ar ? "مشاهدة" : "views"}</span>
        </div>
        <Link className={styles.openWork} href={"/" + locale + "/watch/" + film.id}>
          {ar ? "صفحة العمل الكاملة" : "Open full work"} <ArrowDown size={15} />
        </Link>
      </div>
    </article>
  );
}

export default function FilmCollectionBrowser({
  locale,
  format,
  items,
  schemaReady,
  unclassifiedCount,
  loadError,
}: Props) {
  const ar = locale === "ar";
  const isShortFilmPage = format === "short_film";
  const [shortFilmMode, setShortFilmMode] = useState<ViewMode | null>(null);
  const mode = isShortFilmPage ? shortFilmMode : "grid";
  const title = isShortFilmPage ? (ar ? "الأفلام القصيرة." : "Short films.") : (ar ? "الأفلام الروائية الطويلة." : "Feature films.");
  const subtitle = isShortFilmPage
    ? (ar ? "أعمال قصيرة برؤية سينمائية — اختر كيف تود اكتشافها." : "Short-form cinema, viewed your way. Choose how you want to explore.")
    : (ar ? "أفلام روائية طويلة في مساحة تمنح كل عمل وقته." : "Feature-length films, given the space and time they deserve.");

  return (
    <section className={"section " + styles.browser} dir={ar ? "rtl" : "ltr"}>
      <header className={styles.hero}>
        <div className={styles.heroMark} aria-hidden="true"><Film size={25} strokeWidth={1.5} /></div>
        <div className={styles.heroCopy}>
          <div className="eyebrow">{ar ? "رَافِين / السينما" : "RAVINE / CINEMA"}</div>
          <h1>{title}</h1>
          <p className="section-note">{subtitle}</p>
        </div>
      </header>

      {isShortFilmPage && mode === null ? (
        <div className={styles.choicePanel}>
          <div className={styles.choiceIntro}>
            <span className={styles.choiceKicker}>{ar ? "قبل أن تبدأ" : "BEFORE YOU BEGIN"}</span>
            <h2>{ar ? "اختر طريقة المشاهدة" : "Choose your viewing mode"}</h2>
            <p>{ar ? "تقدر تبدأ بكروت الأعمال أو تتصفح فيلمًا وراء الآخر بسكرولينج رأسي." : "Browse the poster cards, or move through the collection one film at a time in a vertical feed."}</p>
          </div>
          <div className={styles.choiceGrid}>
            <button type="button" className={styles.choiceButton} onClick={() => setShortFilmMode("grid")}>
              <span className={styles.choiceIcon}><LayoutGrid size={24} /></span>
              <strong>{ar ? "عرض الكروت" : "Card view"}</strong>
              <span>{ar ? "ملصقات وأوصاف في شبكة عادية." : "A familiar poster grid with details."}</span>
            </button>
            <button type="button" className={styles.choiceButton} onClick={() => setShortFilmMode("feed")}>
              <span className={styles.choiceIcon}><ArrowDown size={25} /></span>
              <strong>{ar ? "عرض التمرير الرأسي" : "Vertical feed"}</strong>
              <span>{ar ? "انتقل لأعلى ولأسفل بين الأعمال مثل موجز الشورتات." : "Scroll vertically through one film at a time, TikTok-style."}</span>
            </button>
          </div>
        </div>
      ) : null}

      {isShortFilmPage && mode !== null ? (
        <div className={styles.modeBar} aria-label={ar ? "طريقة عرض الأفلام القصيرة" : "Short film viewing mode"}>
          <span>{ar ? "طريقة العرض" : "VIEW MODE"}</span>
          <button type="button" className={mode === "grid" ? styles.modeActive : ""} aria-pressed={mode === "grid"} onClick={() => setShortFilmMode("grid")}><LayoutGrid size={15} />{ar ? "كروت" : "Cards"}</button>
          <button type="button" className={mode === "feed" ? styles.modeActive : ""} aria-pressed={mode === "feed"} onClick={() => setShortFilmMode("feed")}><ArrowDown size={15} />{ar ? "تمرير رأسي" : "Vertical feed"}</button>
        </div>
      ) : null}

      {!schemaReady && !loadError ? (
        <div className={styles.notice} role="status">
          <strong>{ar ? "تصنيف الأفلام قيد التجهيز." : "Film classification is not available yet."}</strong>
          <span>{unclassifiedCount > 0
            ? (ar ? "يوجد " + unclassifiedCount + " عملًا سينمائيًا قديمًا لم يُصنّف بعد كفيلم قصير أو طويل. لن نضعه في القسم الخطأ تلقائيًا." : unclassifiedCount + " legacy film work(s) still need an explicit Short Film or Feature Film classification. They will not be assigned to the wrong section automatically.")
            : (ar ? "سيظهر المحتوى هنا بعد تفعيل تصنيف الأفلام القصيرة والطويلة في قاعدة البيانات." : "Works will appear here once short/feature film classification is available in the database.")}</span>
        </div>
      ) : null}

      {schemaReady && unclassifiedCount > 0 ? (
        <div className={styles.notice} role="status">
          <strong>{ar ? "هناك أعمال تنتظر التصنيف." : "Some films are awaiting classification."}</strong>
          <span>{ar ? "عدد الأعمال غير المصنفة: " + unclassifiedCount + ". لن نعتبر مدة الفيلم وحدها دليلًا على كونه قصيرًا أو طويلًا." : unclassifiedCount + " film work(s) have no explicit subtype. Runtime alone will not be used to guess their category."}</span>
        </div>
      ) : null}

      {loadError ? (
        <div className={"empty-state " + styles.errorState}>
          <strong>{ar ? "تعذر تحميل الأعمال السينمائية." : "We could not load the film collection."}</strong>
          <span>{ar ? "حاول مرة أخرى لاحقًا." : "Please try again later."}</span>
        </div>
      ) : null}

      {schemaReady && items.length === 0 && !loadError && (!isShortFilmPage || mode !== null) ? (
        <div className={"empty-state " + styles.emptyState}>
          <strong>{format === "short_film" ? (ar ? "لا توجد أفلام قصيرة مصنفة بعد." : "No classified short films yet.") : (ar ? "لا توجد أفلام روائية طويلة مصنفة بعد." : "No classified feature films yet.")}</strong>
          <span>{ar ? "ستظهر هنا الأعمال المنشورة التي اختير نوعها السينمائي صراحةً داخل الاستوديو." : "Published works explicitly classified in Studio will appear here."}</span>
        </div>
      ) : null}

      {schemaReady && items.length > 0 && mode === "grid" ? (
        <div className="video-grid">
          {items.map((film) => <FilmCard key={film.id} film={film} locale={locale} format={format} />)}
        </div>
      ) : null}

      {schemaReady && items.length > 0 && mode === "feed" && isShortFilmPage ? (
        <div className={styles.feedScroller} aria-label={ar ? "موجز الأفلام القصيرة" : "Short film feed"}>
          {items.map((film, index) => <FilmFeedItem key={film.id} film={film} locale={locale} order={index} />)}
        </div>
      ) : null}

    </section>
  );
}

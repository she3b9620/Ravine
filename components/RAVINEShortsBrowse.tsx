"use client";

import Link from "next/link";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownUp, AudioLines, Check, Grid2X2, Pause, Play, Search, Volume2, VolumeX, X } from "lucide-react";
import { resolveWorkPlaybackUrl } from "@/lib/ravine-playback-core";
import styles from "./RAVINEShortsBrowse.module.css";
import { formatRavineNumber } from "@/lib/ravine-number-formatter";

type Locale = "ar" | "en";
type ShortWork = {
  id: number;
  title: string | null;
  description: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
  duration: number | null;
  views: number | null;
  likes: number | null;
  quality: string | null;
  created_at: string | null;
};

type Props = { locale: Locale; works: ShortWork[] };
type ViewMode = "grid" | "reels";
type SortMode = "newest" | "views" | "likes";
const PREFERENCE_KEY = "ravine.shorts.view-mode.v1";

function formatDuration(seconds: number | null, fallback: string) {
  if (!seconds || seconds < 1) return fallback;
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return minutes > 0 ? `${minutes}:${String(remaining).padStart(2, "0")}` : `0:${String(remaining).padStart(2, "0")}`;
}

export default function RAVINEShortsBrowse({ locale, works }: Props) {
  const ar = locale === "ar";
  const [mode, setMode] = useState<ViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const videosRef = useRef(new Map<number, HTMLVideoElement>());
  const observersRef = useRef<IntersectionObserver | null>(null);
  const activeRef = useRef<number | null>(null);
  const visibilityRatiosRef = useRef(new Map<HTMLElement, number>());
  const manuallyPausedRef = useRef(new Set<number>());

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PREFERENCE_KEY);
      if (saved === "reels") startTransition(() => setMode("reels"));
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  const filteredWorks = useMemo(() => {
    const query = searchQuery.trim().toLocaleLowerCase(locale);
    const matches = works.filter((work) => !query || [work.title || "", work.description || "", work.quality || ""]
      .join(" ").toLocaleLowerCase(locale).includes(query));
    return matches.sort((left, right) => {
      if (sortMode === "views") return Number(right.views || 0) - Number(left.views || 0);
      if (sortMode === "likes") return Number(right.likes || 0) - Number(left.likes || 0);
      return (Date.parse(right.created_at || "") || 0) - (Date.parse(left.created_at || "") || 0);
    });
  }, [works, locale, searchQuery, sortMode]);

  useEffect(() => {
    if (mode !== "reels") {
      document.documentElement.removeAttribute("data-ravine-shorts-reels");
      return;
    }
    document.documentElement.setAttribute("data-ravine-shorts-reels", "true");
    return () => document.documentElement.removeAttribute("data-ravine-shorts-reels");
  }, [mode]);

  const chooseMode = useCallback((next: ViewMode) => {
    if (next === "grid") {
      videosRef.current.forEach((video) => video.pause());
      activeRef.current = null;
      manuallyPausedRef.current.clear();
      setPlayingId(null);
    }
    setMode(next);
    try {
      window.localStorage.setItem(PREFERENCE_KEY, next);
    } catch {
      // The mode still changes for this page view when storage is unavailable.
    }
  }, []);

  const attachVideo = useCallback((workId: number, node: HTMLVideoElement | null) => {
    if (!node) {
      videosRef.current.delete(workId);
      return;
    }
    videosRef.current.set(workId, node);
    node.muted = muted;
  }, [muted]);

  useEffect(() => {
    if (mode !== "reels" || typeof IntersectionObserver === "undefined") {
      observersRef.current?.disconnect();
      observersRef.current = null;
      videosRef.current.forEach((video) => video.pause());
      visibilityRatiosRef.current.clear();
      manuallyPausedRef.current.clear();
      activeRef.current = null;
      return;
    }

    const videos = videosRef.current;
    const visibilityRatios = visibilityRatiosRef.current;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const reel = entry.target as HTMLElement;
        visibilityRatiosRef.current.set(reel, entry.isIntersecting ? entry.intersectionRatio : 0);
      });

      // Choose from every currently visible reel, not only targets that changed
      // in this particular IntersectionObserver callback.
      const activeReel = [...visibilityRatiosRef.current.entries()]
        .filter(([, ratio]) => ratio >= 0.25)
        .sort((a, b) => b[1] - a[1])[0]?.[0];
      const rawId = activeReel ? Number(activeReel.dataset.shortId) : Number.NaN;

      if (!activeReel || !Number.isInteger(rawId)) {
        if (activeRef.current !== null) manuallyPausedRef.current.delete(activeRef.current);
        activeRef.current = null;
        videosRef.current.forEach((video) => video.pause());
        setPlayingId(null);
        return;
      }

      const previousId = activeRef.current;
      if (previousId !== null && previousId !== rawId) {
        // A manual pause applies only while the viewer remains on that reel.
        manuallyPausedRef.current.delete(previousId);
      }
      activeRef.current = rawId;

      videosRef.current.forEach((video, id) => {
        if (id !== rawId) video.pause();
      });

      const video = videosRef.current.get(rawId);
      if (video && video.dataset.playbackUnavailable !== "true" && !manuallyPausedRef.current.has(rawId)) {
        if (video.paused) {
          void video.play().then(() => {
            if (activeRef.current === rawId && !video.paused) setPlayingId(rawId);
          }).catch(() => {
            if (activeRef.current === rawId) setPlayingId(null);
          });
        } else {
          setPlayingId(rawId);
        }
      } else if (!video || video.paused) {
        setPlayingId(null);
      }
    }, { threshold: [0.25, 0.6, 0.8] });

    document.querySelectorAll<HTMLElement>("[data-ravine-short-reel]").forEach((node) => {
      visibilityRatiosRef.current.set(node, 0);
      observer.observe(node);
    });
    observersRef.current = observer;
    return () => {
      observer.disconnect();
      observersRef.current = null;
      videos.forEach((video) => video.pause());
      visibilityRatios.clear();
      activeRef.current = null;
    };
  }, [mode, filteredWorks]);

  useEffect(() => {
    videosRef.current.forEach((video) => {
      video.muted = muted;
    });
  }, [muted]);

  function togglePlayback(workId: number) {
    const video = videosRef.current.get(workId);
    if (!video || video.dataset.playbackUnavailable === "true") return;
    if (video.paused) {
      videosRef.current.forEach((other, id) => {
        if (id !== workId) other.pause();
      });
      manuallyPausedRef.current.delete(workId);
      activeRef.current = workId;
      void video.play().then(() => {
        if (activeRef.current === workId && !video.paused) setPlayingId(workId);
      }).catch(() => {
        if (activeRef.current === workId) setPlayingId(null);
      });
    } else {
      video.pause();
      manuallyPausedRef.current.add(workId);
      setPlayingId(null);
    }
  }

  const modeLabel = ar ? "نظام العرض" : "View mode";

  return (
    <div className={styles.experience} data-ravine-shorts-mode={mode}>
      <div className={styles.toolbar}>
        <div className={styles.toolbarCopy}>
          <span>{modeLabel}</span>
          <small>{ar ? "اختار الطريقة الأنسب لمشاهدتك." : "Choose how you prefer to watch."}</small>
        </div>
        <div className={styles.modeSwitch} role="group" aria-label={modeLabel}>
          <button type="button" className={mode === "grid" ? styles.modeActive : ""} onClick={() => chooseMode("grid")} aria-pressed={mode === "grid"}>
            <Grid2X2 size={16} aria-hidden="true" />
            <span>{ar ? "العرض العادي" : "Grid view"}</span>
            {mode === "grid" ? <Check size={14} aria-hidden="true" /> : null}
          </button>
          <button type="button" className={mode === "reels" ? styles.modeActive : ""} onClick={() => chooseMode("reels")} aria-pressed={mode === "reels"}>
            <AudioLines size={16} aria-hidden="true" />
            <span>{ar ? "عرض عمودي" : "Swipe feed"}</span>
            {mode === "reels" ? <Check size={14} aria-hidden="true" /> : null}
          </button>
        </div>
      </div>

      <div className={styles.browseTools}>
        <label className={styles.searchBox}>
          <Search size={16} aria-hidden="true" />
          <input type="search" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={ar ? "ابحث في الشورتات..." : "Search Shorts..."} aria-label={ar ? "البحث في الشورتات" : "Search Shorts"} />
          {searchQuery ? <button type="button" onClick={() => setSearchQuery("")} aria-label={ar ? "مسح البحث" : "Clear search"}><X size={14} /></button> : null}
        </label>
        <label className={styles.sortBox}>
          <ArrowDownUp size={15} aria-hidden="true" /><span>{ar ? "الترتيب" : "Sort"}</span>
          <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} aria-label={ar ? "ترتيب الشورتات" : "Sort Shorts"}>
            <option value="newest">{ar ? "الأحدث" : "Newest"}</option>
            <option value="views">{ar ? "الأكثر مشاهدة" : "Most viewed"}</option>
            <option value="likes">{ar ? "الأكثر إعجابًا" : "Most liked"}</option>
          </select>
        </label>
        <span className={styles.searchCount} role="status" aria-live="polite">{formatRavineNumber(filteredWorks.length, locale)} {ar ? "شورت" : "Shorts"}</span>
      </div>

      {filteredWorks.length === 0 ? (
        <div className={styles.noResults} role="status">
          <strong>{ar ? "لا توجد شورتات مطابقة." : "No matching Shorts."}</strong>
          <span>{ar ? "جرّب البحث بكلمة مختلفة أو امسح البحث لعرض كل الشورتات." : "Try another search or clear it to see every Short."}</span>
          {searchQuery ? <button type="button" onClick={() => setSearchQuery("")}>{ar ? "عرض الكل" : "Show all"}</button> : null}
        </div>
      ) : mode === "grid" ? (
        <div className={`video-grid ravine-documentaries-grid ravine-shorts-grid ${styles.grid}`}>
          {filteredWorks.map((work) => (
            <Link href={`/${locale}/watch/${work.id}`} className="video-card" key={work.id}>
              <div className="video-thumb">
                <img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" loading="lazy" />
                <span className="duration">{formatDuration(work.duration, "—")}</span>
                <span className="documentary-pill">{ar ? "شورت" : "SHORT"}</span>
              </div>
              <div className="video-meta">
                <div className="video-kicker">SHORT{work.quality ? ` · ${work.quality}` : ""}</div>
                <h2>{work.title || (ar ? "شورت بدون عنوان" : "Untitled short")}</h2>
                <p>{work.description || (ar ? "مقطع قصير من مجتمع رَافِين." : "A short from the RAVINE community.")}</p>
                <div className="video-stats">
                  <span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span>
                  <span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className={styles.reelsLayout} aria-label={ar ? "عرض الشورتات العمودي" : "Vertical Shorts feed"}>
          <div className={styles.reelsHint}><span />{ar ? "اسحب لأعلى أو لأسفل للتنقل بين الشورتات" : "Scroll vertically to move between Shorts"}</div>
          <div className={styles.reelsFeed}>
            {filteredWorks.map((work, index) => {
              const source = resolveWorkPlaybackUrl(work.id, work.video_url);
              return (
                <article className={styles.reel} key={work.id} data-ravine-short-reel data-short-id={work.id}>
                  <div className={styles.reelStage}>
                    {source ? (
                      <video
                        ref={(node) => attachVideo(work.id, node)}
                        className={styles.reelVideo}
                        src={source}
                        poster={work.thumbnail_url || "/RAVINE.PNG"}
                        playsInline
                        loop
                        muted={muted}
                        preload={index < 2 ? "metadata" : "none"}
                        onPlay={() => setPlayingId(work.id)}
                        onPause={() => setPlayingId((current) => current === work.id ? null : current)}
                        onError={(event) => { event.currentTarget.dataset.playbackUnavailable = "true"; setPlayingId((current) => current === work.id ? null : current); }}
                        aria-label={work.title || (ar ? "شورت" : "Short")}
                      />
                    ) : (
                      <div className={styles.unavailable}><img src={work.thumbnail_url || "/RAVINE.PNG"} alt="" /><span>{ar ? "الفيديو غير متاح للتشغيل" : "Video playback is unavailable"}</span></div>
                    )}
                    <button className={styles.playToggle} type="button" onClick={() => togglePlayback(work.id)} aria-label={playingId === work.id ? (ar ? "إيقاف مؤقت" : "Pause") : (ar ? "تشغيل" : "Play")}>
                      {playingId === work.id ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
                    </button>
                    <div className={styles.reelScrim} />
                    <div className={styles.reelMeta}>
                      <div className={styles.reelKicker}>RAVINE SHORT · {formatDuration(work.duration, "—")}</div>
                      <h2>{work.title || (ar ? "شورت بدون عنوان" : "Untitled short")}</h2>
                      {work.description ? <p>{work.description}</p> : null}
                      <div className={styles.reelStats}><span>{formatRavineNumber(Number(work.views || 0), locale)} {ar ? "مشاهدة" : "views"}</span><span>{formatRavineNumber(Number(work.likes || 0), locale)} {ar ? "إعجاب" : "likes"}</span></div>
                      <Link href={`/${locale}/watch/${work.id}`} className={styles.openWork}>{ar ? "فتح صفحة العمل" : "Open work"} <span aria-hidden="true">↗</span></Link>
                    </div>
                    <div className={styles.reelActions}>
                      <button type="button" onClick={() => setMuted((value) => !value)} aria-pressed={!muted} aria-label={muted ? (ar ? "تشغيل الصوت" : "Turn sound on") : (ar ? "كتم الصوت" : "Mute sound")}>
                        {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                      </button>
                      <span>{muted ? (ar ? "صامت" : "Muted") : (ar ? "الصوت يعمل" : "Sound on")}</span>
                    </div>
                    <div className={styles.reelIndex}>{String(index + 1).padStart(2, "0")} <span>/</span> {String(works.length).padStart(2, "0")}</div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

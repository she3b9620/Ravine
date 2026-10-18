"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AudioLines, Check, Grid2X2, Pause, Play, Volume2, VolumeX } from "lucide-react";
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
};

type Props = { locale: Locale; works: ShortWork[] };
type ViewMode = "grid" | "reels";
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
  const [ready, setReady] = useState(false);
  const [muted, setMuted] = useState(true);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const videosRef = useRef(new Map<number, HTMLVideoElement>());
  const observersRef = useRef<IntersectionObserver | null>(null);
  const activeRef = useRef<number | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PREFERENCE_KEY);
      if (saved === "grid" || saved === "reels") setMode(saved);
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (mode !== "reels") {
      document.documentElement.removeAttribute("data-ravine-shorts-reels");
      return;
    }
    document.documentElement.setAttribute("data-ravine-shorts-reels", "true");
    return () => document.documentElement.removeAttribute("data-ravine-shorts-reels");
  }, [mode]);

  const chooseMode = useCallback((next: ViewMode) => {
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
      setPlayingId(null);
      activeRef.current = null;
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const candidates = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const active = candidates[0]?.target as HTMLElement | undefined;

      if (!active) {
        videosRef.current.forEach((video) => video.pause());
        setPlayingId(null);
        activeRef.current = null;
        return;
      }
      const rawId = Number(active.dataset.shortId);
      if (!Number.isInteger(rawId)) return;
      activeRef.current = rawId;

      videosRef.current.forEach((video, id) => {
        if (id !== rawId) video.pause();
      });
      const video = videosRef.current.get(rawId);
      if (video && video.dataset.playbackUnavailable !== "true") {
        void video.play().then(() => setPlayingId(rawId)).catch(() => setPlayingId(null));
      }
    }, { threshold: [0.25, 0.6, 0.8] });

    document.querySelectorAll<HTMLElement>("[data-ravine-short-reel]").forEach((node) => observer.observe(node));
    observersRef.current = observer;
    return () => {
      observer.disconnect();
      observersRef.current = null;
      videosRef.current.forEach((video) => video.pause());
      activeRef.current = null;
    };
  }, [mode, works]);

  useEffect(() => {
    videosRef.current.forEach((video) => {
      video.muted = muted;
    });
  }, [muted]);

  function togglePlayback(workId: number) {
    const video = videosRef.current.get(workId);
    if (!video) return;
    if (video.paused) {
      void video.play().then(() => setPlayingId(workId)).catch(() => setPlayingId(null));
    } else {
      video.pause();
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

      {works.length === 0 ? null : mode === "grid" ? (
        <div className={`video-grid ravine-documentaries-grid ravine-shorts-grid ${styles.grid}`}>
          {works.map((work) => (
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
            {works.map((work, index) => {
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
      {!ready ? <span className={styles.preferenceNote} aria-live="polite">{ar ? "جاري استعادة تفضيل العرض…" : "Restoring your view preference…"}</span> : null}
    </div>
  );
}

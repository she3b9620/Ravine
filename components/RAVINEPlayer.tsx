"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, ExternalLink, List, Maximize2, Pause, Play, RotateCcw, RotateCw, Settings2, Volume2 } from "lucide-react";
import styles from "./RAVINEPlayer.module.css";

type Chapter = { id: number; title: string; start_seconds: number; end_seconds: number | null; thumbnail_url: string | null };
type Asset = { id: number; kind: string; media_url: string; duration: number | null; label: string | null; language: string | null; mime_type: string | null };

type Props = {
  src: string | null;
  poster?: string | null;
  title: string;
  contentType: string;
  duration: number | null;
  locale: "ar" | "en";
  chapters?: Chapter[];
  assets?: Asset[];
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "0:00";
  const total = Math.max(0, Math.floor(value));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

export default function RAVINEPlayer({ src, poster, title, contentType, duration, locale, chapters = [], assets = [] }: Props) {
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [readyDuration, setReadyDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [introChoice, setIntroChoice] = useState<"main" | "trailer" | "preview">(assets.some((a) => a.kind === "trailer" || a.kind === "preview") ? "main" : "main");

  const trailer = useMemo(() => assets.find((asset) => asset.kind === "trailer"), [assets]);
  const preview = useMemo(() => assets.find((asset) => asset.kind === "preview"), [assets]);
  const activeAuxiliary = introChoice === "trailer" ? trailer : introChoice === "preview" ? preview : null;
  const activeSrc = activeAuxiliary?.media_url || src;
  const activeDuration = activeAuxiliary?.duration || readyDuration;

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }, []);

  const revealControls = useCallback(() => {
    clearControlsTimer();
    setShowControls(true);
    if (playing) {
      controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 2800);
    }
  }, [clearControlsTimer, playing]);

  const syncPlaying = useCallback((nextPlaying: boolean) => {
    setPlaying(nextPlaying);
    if (nextPlaying) revealControls();
    else {
      clearControlsTimer();
      setShowControls(true);
    }
  }, [clearControlsTimer, revealControls]);

  useEffect(() => {
    return () => clearControlsTimer();
  }, [clearControlsTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.load();
    setCurrent(0);
    syncPlaying(false);
  }, [activeSrc, syncPlaying]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    if (!playing) return;
    revealControls();
  }, [playing, revealControls]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) void video.play().catch(() => undefined);
    else video.pause();
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.duration || activeDuration || 0, video.currentTime + delta));
    revealControls();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = seconds;
    revealControls();
    if (video.paused) void video.play().catch(() => undefined);
  }

  async function toggleFullscreen() {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await video.requestFullscreen();
    } catch {
      setShowSettings(true);
      revealControls();
    }
  }

  return (
    <section
      className={styles.player}
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? "مشغل RAVINE" : "RAVINE player"}
      onMouseMove={revealControls}
      onPointerDown={revealControls}
      onTouchStart={revealControls}
    >
      <div className={styles.stage}>
        {activeSrc ? (
          <video
            ref={videoRef}
            className="watch-video"
            playsInline
            preload="metadata"
            poster={poster || undefined}
            src={activeSrc}
            onPlay={() => syncPlaying(true)}
            onPause={() => syncPlaying(false)}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => setReadyDuration(event.currentTarget.duration || duration || 0)}
            onVolumeChange={(event) => setVolume(event.currentTarget.volume)}
            onEnded={() => {
              syncPlaying(false);
              if (activeAuxiliary) setIntroChoice("main");
            }}
          >
            {ar ? "متصفحك لا يدعم تشغيل الفيديو." : "Your browser does not support video playback."}
          </video>
        ) : (
          <div className={styles.empty}>{ar ? "العمل غير متاح للتشغيل حاليًا." : "This work is not available for playback yet."}</div>
        )}

        {activeAuxiliary ? (
          <div className={styles.auxiliaryLabel}>
            {introChoice === "trailer" ? (ar ? "التريلر" : "TRAILER") : (ar ? "المعاينة" : "PREVIEW")}
            <button type="button" onClick={() => { setIntroChoice("main"); revealControls(); }}>{ar ? "مشاهدة العمل" : "Watch full work"}</button>
          </div>
        ) : null}
      </div>

      {(trailer || preview) && introChoice === "main" ? (
        <div className={styles.introBar}>
          <span>{ar ? "قبل المشاهدة" : "Before watching"}</span>
          {trailer ? <button type="button" onClick={() => { setIntroChoice("trailer"); revealControls(); }}>{ar ? "شاهد التريلر" : "Watch trailer"}</button> : null}
          {preview ? <button type="button" onClick={() => { setIntroChoice("preview"); revealControls(); }}>{ar ? "شاهد المعاينة" : "Watch preview"}</button> : null}
          <button className={styles.primaryChoice} type="button" onClick={() => { setIntroChoice("main"); revealControls(); }}>{ar ? "ابدأ العمل" : "Start work"}</button>
        </div>
      ) : null}

      <div className={`${styles.controls} ${!showControls && playing ? styles.quietControls : ""}`} aria-hidden={!showControls && playing}>
        <div className={styles.timelineRow}>
          <span>{formatTime(current)}</span>
          <input aria-label={ar ? "موضع التشغيل" : "Playback position"} type="range" min="0" max={activeDuration || 0} step="0.1" value={Math.min(current, activeDuration || 0)} onChange={(event) => seekTo(Number(event.target.value))} />
          <span>{formatTime(activeDuration || 0)}</span>
        </div>
        <div className={styles.controlRow}>
          <button type="button" onClick={() => seekBy(-10)} title={ar ? "رجوع 10 ثوانٍ" : "Back 10 seconds"}><RotateCcw size={17} /></button>
          <button className={styles.play} type="button" onClick={togglePlay} title={playing ? (ar ? "إيقاف مؤقت" : "Pause") : (ar ? "تشغيل" : "Play")}>{playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
          <button type="button" onClick={() => seekBy(30)} title={ar ? "تقدم 30 ثانية" : "Forward 30 seconds"}><RotateCw size={17} /></button>
          <label className={styles.volume}><Volume2 size={16} /><input aria-label={ar ? "مستوى الصوت" : "Volume"} type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (videoRef.current) videoRef.current.volume = value; }} /></label>
          <button type="button" onClick={() => { setShowChapters((value) => !value); revealControls(); }} aria-pressed={showChapters} title={ar ? "الفصول" : "Chapters"}><List size={17} /></button>
          <button type="button" onClick={() => { setShowSettings((value) => !value); revealControls(); }} aria-pressed={showSettings} title={ar ? "الإعدادات" : "Settings"}><Settings2 size={17} /></button>
          <button type="button" onClick={() => void toggleFullscreen()} title={ar ? "ملء الشاشة" : "Fullscreen"}><Maximize2 size={17} /></button>
        </div>
      </div>

      {showSettings ? (
        <div className={styles.panel}>
          <strong>{ar ? "إعدادات التشغيل" : "Playback settings"}</strong>
          <div className={styles.optionGroup}><span>{ar ? "السرعة" : "Speed"}</span>{[0.75, 1, 1.25, 1.5, 2].map((value) => <button key={value} className={speed === value ? styles.selected : ""} type="button" onClick={() => setSpeed(value)}>{value}×</button>)}</div>
          <div className={styles.optionGroup}><span>{ar ? "العمل" : "Work"}</span><span className={styles.muted}>{contentType.toUpperCase()}</span><span className={styles.muted}>{title}</span></div>
        </div>
      ) : null}

      {showChapters ? (
        <div className={styles.chapterPanel}>
          <div className={styles.panelHead}><strong>{ar ? "الفصول" : "Chapters"}</strong><span>{chapters.length}</span></div>
          {chapters.length ? chapters.map((chapter) => (
            <button className={styles.chapter} type="button" key={chapter.id} onClick={() => seekTo(chapter.start_seconds)}>
              {chapter.thumbnail_url ? <img src={chapter.thumbnail_url} alt="" /> : <span className={styles.chapterTime}>{formatTime(chapter.start_seconds)}</span>}
              <span><strong>{chapter.title}</strong><small>{formatTime(chapter.start_seconds)}{chapter.end_seconds ? ` — ${formatTime(chapter.end_seconds)}` : ""}</small></span>
            </button>
          )) : <div className={styles.muted}>{ar ? "لم تتم إضافة فصول لهذا العمل بعد." : "No chapters have been added yet."}</div>}
        </div>
      ) : null}

      <div className={styles.metaRow}>
        <span>{contentType}</span>
        {trailer ? <span><Bookmark size={13} /> {ar ? "Trailer متاح" : "Trailer available"}</span> : null}
        {preview ? <span><ExternalLink size={13} /> {ar ? "Preview متاح" : "Preview available"}</span> : null}
        {chapters.length ? <span><Check size={13} /> {chapters.length} {ar ? "فصل" : "chapters"}</span> : null}
      </div>
    </section>
  );
}

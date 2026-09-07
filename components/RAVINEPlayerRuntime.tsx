"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, List, Maximize2, Pause, PictureInPicture, Play, RotateCcw, RotateCw, Settings2, Volume2 } from "lucide-react";
import styles from "./RAVINEPlayer.module.css";
import {
  formatRAVINETime,
  getRAVINEPlayerKind,
  resolveAssetPlaybackUrl,
  type RAVINEPlaybackAsset,
} from "@/lib/ravine-playback-core";

type Chapter = {
  id: number;
  title: string;
  start_seconds: number;
  end_seconds: number | null;
  thumbnail_url: string | null;
};

type Props = {
  src: string | null;
  poster?: string | null;
  title: string;
  contentType: string;
  duration: number | null;
  locale: "ar" | "en";
  chapters?: Chapter[];
  assets?: RAVINEPlaybackAsset[];
};

function mediaErrorCopy(code: MediaError["code"] | undefined, ar: boolean) {
  if (code === MediaError.MEDIA_ERR_ABORTED) return ar ? "تم إيقاف تشغيل الوسائط." : "Media playback was aborted.";
  if (code === MediaError.MEDIA_ERR_NETWORK) return ar ? "تعذر الوصول إلى ملف الوسائط. تحقق من الاتصال ثم أعد المحاولة." : "The media could not be loaded from the network. Check the connection and try again.";
  if (code === MediaError.MEDIA_ERR_DECODE) return ar ? "لا يستطيع المتصفح فك ترميز هذا الملف. قد تحتاج المنصة إلى نسخة تشغيل متوافقة." : "This file could not be decoded. The work may need a browser-compatible playback version.";
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return ar ? "صيغة هذا الملف غير مدعومة للتشغيل هنا." : "This media format is not supported for playback here.";
  return ar ? "تعذر تشغيل هذا العمل حاليًا." : "This work could not be played right now.";
}

export default function RAVINEPlayerRuntime({ src, poster, title, contentType, duration, locale, chapters = [], assets = [] }: Props) {
  const ar = locale === "ar";
  const kind = getRAVINEPlayerKind(contentType);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const playingRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [readyDuration, setReadyDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [pipActive, setPipActive] = useState(false);
  const [introChoice, setIntroChoice] = useState<"main" | "trailer" | "preview">("main");

  const normalizedAssets = useMemo(
    () => assets.map((asset) => ({ ...asset, media_url: resolveAssetPlaybackUrl(asset) })).filter((asset) => Boolean(asset.media_url)),
    [assets],
  );
  const trailer = useMemo(() => normalizedAssets.find((asset) => asset.kind === "trailer"), [normalizedAssets]);
  const preview = useMemo(() => normalizedAssets.find((asset) => asset.kind === "preview"), [normalizedAssets]);
  const activeAuxiliary = introChoice === "trailer" ? trailer : introChoice === "preview" ? preview : null;
  const activeSrc = activeAuxiliary?.media_url || src;
  const activeDuration = activeAuxiliary?.duration || readyDuration;

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current !== null) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }, []);

  const revealControls = useCallback(() => {
    clearControlsTimer();
    setShowControls(true);
    if (playingRef.current) controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 2800);
  }, [clearControlsTimer]);

  const syncPlaying = useCallback((nextPlaying: boolean) => {
    playingRef.current = nextPlaying;
    setPlaying(nextPlaying);
    if (nextPlaying) {
      setEnded(false);
      revealControls();
    } else {
      clearControlsTimer();
      setShowControls(true);
    }
  }, [clearControlsTimer, revealControls]);

  useEffect(() => () => clearControlsTimer(), [clearControlsTimer]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    setMediaError(null);
    setCurrent(0);
    setEnded(false);
    setShowChapters(false);
    setShowSettings(false);
    playingRef.current = false;
    setPlaying(false);
    setReadyDuration(duration || 0);
    video.load();
  }, [activeSrc, duration]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = speed;
  }, [speed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnter = () => setPipActive(true);
    const handleLeave = () => setPipActive(false);
    video.addEventListener("enterpictureinpicture", handleEnter);
    video.addEventListener("leavepictureinpicture", handleLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", handleEnter);
      video.removeEventListener("leavepictureinpicture", handleLeave);
    };
  }, [activeSrc]);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      setMediaError(null);
      setEnded(false);
      void video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    const max = video.duration || activeDuration || 0;
    video.currentTime = Math.max(0, Math.min(max, video.currentTime + delta));
    revealControls();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    const max = video.duration || activeDuration || 0;
    video.currentTime = Math.max(0, Math.min(max, seconds));
    setEnded(false);
    setMediaError(null);
    revealControls();
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

  async function togglePictureInPicture() {
    const video = videoRef.current as (HTMLVideoElement & { requestPictureInPicture?: () => Promise<PictureInPictureWindow> }) | null;
    if (!video || typeof document === "undefined") return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else if (video.requestPictureInPicture) await video.requestPictureInPicture();
    } catch {
      setShowSettings(true);
      revealControls();
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLElement>) {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLButtonElement) return;
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      event.preventDefault();
      togglePlay();
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      seekBy(ar ? 10 : -10);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      seekBy(ar ? -10 : 10);
    } else if (key === "j") {
      event.preventDefault();
      seekBy(-10);
    } else if (key === "l") {
      event.preventDefault();
      seekBy(10);
    } else if (key === "m") {
      event.preventDefault();
      const video = videoRef.current;
      if (!video) return;
      const next = video.muted ? volume || 1 : 0;
      video.muted = next === 0;
      video.volume = next;
      setVolume(next);
    } else if (key === "f") {
      event.preventDefault();
      void toggleFullscreen();
    } else if (key === "p") {
      event.preventDefault();
      void togglePictureInPicture();
    }
  }

  return (
    <section
      className={`${styles.player} ravine-player--${kind}`}
      data-ravine-player-kind={kind}
      data-ravine-playback-runtime="deterministic"
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? `مشغل RAVINE — ${contentType}` : `RAVINE ${contentType} player`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={revealControls}
      onPointerDown={revealControls}
      onTouchStart={revealControls}
    >
      <div className={`${styles.stage} ${ended ? styles.ended : ""}`} style={ended && poster ? { backgroundImage: `url(${poster})` } : undefined}>
        {activeSrc ? (
          <video
            ref={videoRef}
            className="watch-video"
            controls={false}
            playsInline
            preload="metadata"
            poster={poster || undefined}
            src={activeSrc}
            onPlay={() => { setMediaError(null); syncPlaying(true); }}
            onPause={() => syncPlaying(false)}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => { setMediaError(null); setReadyDuration(event.currentTarget.duration || duration || 0); }}
            onLoadedData={() => setMediaError(null)}
            onError={(event) => { setMediaError(mediaErrorCopy(event.currentTarget.error?.code, ar)); syncPlaying(false); }}
            onVolumeChange={(event) => { setVolume(event.currentTarget.volume); }}
            onEnded={() => { setEnded(true); syncPlaying(false); if (activeAuxiliary) setIntroChoice("main"); }}
          >
            {ar ? "متصفحك لا يدعم تشغيل الفيديو." : "Your browser does not support video playback."}
          </video>
        ) : (
          <div className={styles.empty}>{ar ? "العمل غير متاح للتشغيل حاليًا." : "This work is not available for playback yet."}</div>
        )}

        {mediaError ? (
          <div className={styles.errorOverlay} role="alert">
            <strong>{ar ? "تعذر التشغيل" : "Playback unavailable"}</strong>
            <span>{mediaError}</span>
            <button type="button" onClick={() => { setMediaError(null); videoRef.current?.load(); revealControls(); }}>{ar ? "إعادة المحاولة" : "Try again"}</button>
          </div>
        ) : null}

        {activeAuxiliary ? (
          <div className={styles.auxiliaryLabel}>
            {introChoice === "trailer" ? (ar ? "التريلر" : "TRAILER") : (ar ? "المعاينة" : "PREVIEW")}
            <button type="button" onClick={() => { setIntroChoice("main"); setEnded(false); setMediaError(null); revealControls(); }}>{ar ? "مشاهدة العمل" : "Watch full work"}</button>
          </div>
        ) : null}
      </div>

      {(trailer || preview) && introChoice === "main" ? (
        <div className={styles.introBar}>
          <span>{ar ? "قبل المشاهدة" : "Before watching"}</span>
          {trailer ? <button type="button" onClick={() => { setIntroChoice("trailer"); setEnded(false); setMediaError(null); revealControls(); }}>{ar ? "شاهد التريلر" : "Watch trailer"}</button> : null}
          {preview ? <button type="button" onClick={() => { setIntroChoice("preview"); setEnded(false); setMediaError(null); revealControls(); }}>{ar ? "شاهد المعاينة" : "Watch preview"}</button> : null}
          <button className={styles.primaryChoice} type="button" onClick={() => { setIntroChoice("main"); setEnded(false); setMediaError(null); revealControls(); }}>{ar ? "ابدأ العمل" : "Start work"}</button>
        </div>
      ) : null}

      <div className={`${styles.controls} ${!showControls && playing ? styles.quietControls : ""}`} aria-hidden={!showControls && playing}>
        <div className={styles.timelineRow}>
          <span>{formatRAVINETime(current)}</span>
          <div className={styles.timelineTrack}>
            <input aria-label={ar ? "موضع التشغيل" : "Playback position"} type="range" min="0" max={activeDuration || 0} step="0.1" value={Math.min(current, activeDuration || 0)} onChange={(event) => seekTo(Number(event.target.value))} />
          </div>
          <span>{formatRAVINETime(activeDuration || 0)}</span>
        </div>
        <div className={styles.controlRow}>
          <button type="button" onClick={() => seekBy(-10)} title={ar ? "رجوع 10 ثوانٍ" : "Back 10 seconds"}><RotateCcw size={17} /></button>
          <button className={styles.play} type="button" onClick={togglePlay} title={playing ? (ar ? "إيقاف مؤقت" : "Pause") : (ar ? "تشغيل" : "Play")}>{playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
          <button type="button" onClick={() => seekBy(30)} title={ar ? "تقدم 30 ثانية" : "Forward 30 seconds"}><RotateCw size={17} /></button>
          <label className={styles.volume}>
            <Volume2 size={16} />
            <input aria-label={ar ? "مستوى الصوت" : "Volume"} type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (videoRef.current) { videoRef.current.volume = value; videoRef.current.muted = value === 0; } }} />
          </label>
          <button type="button" onClick={() => { setShowChapters((value) => !value); revealControls(); }} aria-pressed={showChapters} title={ar ? "الفصول" : "Chapters"}><List size={17} /></button>
          <button type="button" onClick={() => { setShowSettings((value) => !value); revealControls(); }} aria-pressed={showSettings} title={ar ? "الإعدادات" : "Settings"}><Settings2 size={17} /></button>
          <button type="button" onClick={() => void togglePictureInPicture()} title={ar ? "صورة داخل صورة" : "Picture in picture"} aria-pressed={pipActive}><PictureInPicture size={17} /></button>
          <button type="button" onClick={() => void toggleFullscreen()} title={ar ? "ملء الشاشة" : "Fullscreen"}><Maximize2 size={17} /></button>
        </div>
      </div>

      {showSettings ? (
        <div className={styles.panel}>
          <div className={styles.panelHead}><strong>{ar ? "إعدادات التشغيل" : "Playback settings"}</strong><span className={styles.muted}>{title}</span></div>
          <div className={styles.optionGroup}>
            <span>{ar ? "السرعة" : "Speed"}</span>
            {[0.75, 1, 1.25, 1.5, 2].map((value) => (
              <button key={value} type="button" className={speed === value ? "selected" : ""} onClick={() => setSpeed(value)} aria-pressed={speed === value}>{value}×</button>
            ))}
          </div>
          <div className={styles.optionGroup}><span>{ar ? "التسليم" : "Delivery"}</span><span className={styles.muted}>{ar ? "يتم اختيار النسخة المتوافقة قبل التشغيل." : "A browser-compatible playback source is resolved before playback."}</span></div>
        </div>
      ) : null}

      {showChapters ? (
        <div className={styles.chapterPanel}>
          <div className={styles.panelHead}><strong>{ar ? "الفصول" : "Chapters"}</strong><span className={styles.muted}>{chapters.length}</span></div>
          {chapters.length ? chapters.map((chapter) => (
            <button type="button" className={styles.chapter} key={chapter.id} onClick={() => seekTo(chapter.start_seconds)}>
              {chapter.thumbnail_url ? <img src={chapter.thumbnail_url} alt="" /> : <span className={styles.chapterTime}>{formatRAVINETime(chapter.start_seconds)}</span>}
              <span><strong>{chapter.title}</strong><small>{formatRAVINETime(chapter.start_seconds)}{chapter.end_seconds !== null ? ` — ${formatRAVINETime(chapter.end_seconds)}` : ""}</small></span>
            </button>
          )) : <span className={styles.muted}>{ar ? "لا توجد فصول لهذا العمل بعد." : "No chapters have been added to this work yet."}</span>}
        </div>
      ) : null}

      <div className={styles.metaRow}>
        <span>{ar ? "وضع التشغيل" : "Playback mode"}: <strong>{kind}</strong></span>
        <span>{chapters.length ? <Check size={13} /> : null}{chapters.length ? (ar ? " فصول متاحة" : " chapters") : (ar ? "بدون فصول" : "no chapters")}</span>
      </div>
    </section>
  );
}

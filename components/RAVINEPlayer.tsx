"use client";

import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, ExternalLink, List, Maximize2, Pause, PictureInPicture, Play, RotateCcw, RotateCw, Settings2, Volume2 } from "lucide-react";
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

function mediaErrorCopy(code: MediaError["code"] | undefined, ar: boolean) {
  if (code === MediaError.MEDIA_ERR_ABORTED) return ar ? "تم إيقاف تشغيل الوسائط." : "Media playback was aborted.";
  if (code === MediaError.MEDIA_ERR_NETWORK) return ar ? "تعذر الوصول إلى ملف الوسائط. تحقق من الاتصال ثم أعد المحاولة." : "The media could not be loaded from the network. Check the connection and try again.";
  if (code === MediaError.MEDIA_ERR_DECODE) return ar ? "لا يستطيع المتصفح فك ترميز هذا الملف. قد يحتاج العمل إلى نسخة RAVINE متوافقة مع التشغيل." : "This file could not be decoded. The work may need a browser-compatible RAVINE playback version.";
  if (code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) return ar ? "صيغة هذا الملف غير مدعومة للتشغيل هنا." : "This media format is not supported for playback here.";
  return ar ? "تعذر تشغيل هذا العمل حاليًا." : "This work could not be played right now.";
}

export default function RAVINEPlayer({ src, poster, title, contentType, duration, locale, chapters = [], assets = [] }: Props) {
  const ar = locale === "ar";
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsTimerRef = useRef<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [current, setCurrent] = useState(0);
  const [readyDuration, setReadyDuration] = useState(duration || 0);
  const [volume, setVolume] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [showChapters, setShowChapters] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [timelineHover, setTimelineHover] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [pipActive, setPipActive] = useState(false);
  const [introChoice, setIntroChoice] = useState<"main" | "trailer" | "preview">("main");

  const trailer = useMemo(() => assets.find((asset) => asset.kind === "trailer"), [assets]);
  const preview = useMemo(() => assets.find((asset) => asset.kind === "preview"), [assets]);
  const activeAuxiliary = introChoice === "trailer" ? trailer : introChoice === "preview" ? preview : null;
  const activeSrc = activeAuxiliary?.media_url || src;
  const activeDuration = activeAuxiliary?.duration || readyDuration;
  const playerKind = contentType === "short" ? "short" : contentType === "podcast" ? "podcast" : contentType === "documentary" ? "documentary" : "video";

  const clearControlsTimer = useCallback(() => {
    if (controlsTimerRef.current) window.clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = null;
  }, []);

  const revealControls = useCallback(() => {
    clearControlsTimer();
    setShowControls(true);
    if (playing) controlsTimerRef.current = window.setTimeout(() => setShowControls(false), 2800);
  }, [clearControlsTimer, playing]);

  const syncPlaying = useCallback((nextPlaying: boolean) => {
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
    video.load();
    setCurrent(0);
    setEnded(false);
    setTimelineHover(null);
    setPipActive(false);
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
      setEnded(false);
      setMediaError(null);
      void video.play().catch(() => undefined);
    } else video.pause();
  }

  function seekBy(delta: number) {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    video.currentTime = Math.max(0, Math.min(video.duration || activeDuration || 0, video.currentTime + delta));
    revealControls();
  }

  function seekTo(seconds: number) {
    const video = videoRef.current;
    if (!video) return;
    setEnded(false);
    setMediaError(null);
    video.currentTime = seconds;
    revealControls();
    if (video.paused) void video.play().catch(() => undefined);
  }

  function handleTimelineHover(event: React.PointerEvent<HTMLDivElement>) {
    const durationValue = activeDuration || 0;
    if (!durationValue) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width) return;
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    setTimelineHover(progress * 100);
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
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (video.requestPictureInPicture) {
        await video.requestPictureInPicture();
      }
    } catch {
      setShowSettings(true);
      revealControls();
    }
  }

  return (
    <section
      className={`${styles.player} ravine-player--${playerKind}`}
      data-ravine-player-kind={playerKind}
      dir={ar ? "rtl" : "ltr"}
      aria-label={ar ? `مشغل RAVINE — ${contentType}` : `RAVINE ${contentType} player`}
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
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture={false}
            disableRemotePlayback
            playsInline
            preload="metadata"
            poster={poster || undefined}
            src={activeSrc}
            onPlay={() => { setMediaError(null); syncPlaying(true); }}
            onPause={() => syncPlaying(false)}
            onTimeUpdate={(event) => setCurrent(event.currentTarget.currentTime)}
            onLoadedMetadata={(event) => { setMediaError(null); setReadyDuration(event.currentTarget.duration || duration || 0); }}
            onLoadedData={() => setMediaError(null)}
            onError={(event) => {
              const code = event.currentTarget.error?.code;
              setMediaError(mediaErrorCopy(code, ar));
              syncPlaying(false);
            }}
            onVolumeChange={(event) => setVolume(event.currentTarget.volume)}
            onEnded={() => {
              setEnded(true);
              syncPlaying(false);
              if (activeAuxiliary) setIntroChoice("main");
            }}
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
          <span>{formatTime(current)}</span>
          <div className={styles.timelineTrack} onPointerMove={handleTimelineHover} onPointerLeave={() => setTimelineHover(null)}>
            {timelineHover !== null ? <span className={styles.timelineHoverLine} style={{ left: `${timelineHover}%` }} aria-hidden="true" /> : null}
            <input aria-label={ar ? "موضع التشغيل" : "Playback position"} type="range" min="0" max={activeDuration || 0} step="0.1" value={Math.min(current, activeDuration || 0)} onChange={(event) => seekTo(Number(event.target.value))} />
          </div>
          <span>{formatTime(activeDuration || 0)}</span>
        </div>
        <div className={styles.controlRow}>
          <button type="button" onClick={() => seekBy(-10)} title={ar ? "رجوع 10 ثوانٍ" : "Back 10 seconds"}><RotateCcw size={17} /></button>
          <button className={styles.play} type="button" onClick={togglePlay} title={playing ? (ar ? "إيقاف مؤقت" : "Pause") : (ar ? "تشغيل" : "Play")}>{playing ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}</button>
          <button type="button" onClick={() => seekBy(30)} title={ar ? "تقدم 30 ثانية" : "Forward 30 seconds"}><RotateCw size={17} /></button>
          <label className={styles.volume}><Volume2 size={16} /><input aria-label={ar ? "مستوى الصوت" : "Volume"} type="range" min="0" max="1" step="0.05" value={volume} style={{ "--volume-fill": `${volume * 100}%` } as CSSProperties} onChange={(event) => { const value = Number(event.target.value); setVolume(value); if (videoRef.current) videoRef.current.volume = value; }} /></label>
          <button type="button" onClick={() => { setShowChapters((value) => !value); revealControls(); }} aria-pressed={showChapters} title={ar ? "الفصول" : "Chapters"}><List size={17} /></button>
          <button type="button" onClick={() => { setShowSettings((value) => !value); revealControls(); }} aria-pressed={showSettings} title={ar ? "الإعدادات" : "Settings"}><Settings2 size={17} /></button>
          <button type="button" onClick={() => void togglePictureInPicture()} title={ar ? "صورة داخل صورة" : "Picture in picture"} aria-pressed={pipActive}><PictureInPicture size={17} /></button>
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

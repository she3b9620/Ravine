"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = { videoUrl: string | null; videoId: number };
type Phase = "idle" | "waiting" | "active" | "fading";

const HOVER_DELAY = 1000;
const SAMPLE_MS = 1000;
const CROSSFADE_MS = 280;
const FADE_OUT_MS = 420;
const LOOP_GAP_MS = 140;
const SAMPLE_RATIOS = [0.08, 0.26, 0.46, 0.66, 0.84];

function isYouTubeUrl(value: string | null) {
  if (!value) return false;
  try {
    const host = new URL(value, window.location.origin).hostname.toLowerCase().replace(/^www\./, "");
    return host === "youtube.com" || host === "youtu.be" || host.endsWith(".youtube.com");
  } catch {
    return false;
  }
}

function normalizeSource(value: string | null, videoId: number) {
  if (!value || isYouTubeUrl(value)) return null;
  try {
    const url = new URL(value, window.location.origin);
    if (url.pathname.includes("/storage/v1/object/public/videos/")) return `/api/media/video/${videoId}`;
  } catch {
    return null;
  }
  return value;
}

function sampleTimes(duration: number) {
  const maxStart = Math.max(0, duration - 0.8);
  return SAMPLE_RATIOS.map((ratio) => Math.min(maxStart, Math.max(0, duration * ratio)));
}

export default function VideoHoverPreview({ videoUrl, videoId }: Props) {
  const source = normalizeSource(videoUrl, videoId);
  const videoARef = useRef<HTMLVideoElement | null>(null);
  const videoBRef = useRef<HTMLVideoElement | null>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const resetTimerRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const hoveredRef = useRef(false);
  const timesRef = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeLayer, setActiveLayer] = useState(0);

  const clearTimers = useCallback(() => {
    if (hoverTimerRef.current !== null) window.clearTimeout(hoverTimerRef.current);
    if (sequenceTimerRef.current !== null) window.clearTimeout(sequenceTimerRef.current);
    if (fadeTimerRef.current !== null) window.clearTimeout(fadeTimerRef.current);
    if (resetTimerRef.current !== null) window.clearTimeout(resetTimerRef.current);
    hoverTimerRef.current = null;
    sequenceTimerRef.current = null;
    fadeTimerRef.current = null;
    resetTimerRef.current = null;
  }, []);

  const resetVideos = useCallback(() => {
    for (const video of [videoARef.current, videoBRef.current]) {
      if (!video) continue;
      video.pause();
      try { video.currentTime = 0; } catch {}
    }
  }, []);

  const finishPreview = useCallback((run: number) => {
    if (run !== runRef.current || !hoveredRef.current) return;
    setPhase("fading");
    fadeTimerRef.current = window.setTimeout(() => {
      if (run !== runRef.current) return;
      resetVideos();
      setActiveLayer(0);
      setPhase("idle");
      if (!hoveredRef.current) return;
      resetTimerRef.current = window.setTimeout(() => {
        if (hoveredRef.current && run === runRef.current) startPreview(run);
      }, LOOP_GAP_MS);
    }, FADE_OUT_MS);
  }, [resetVideos]);

  const scheduleNext = useCallback((index: number, run: number) => {
    sequenceTimerRef.current = window.setTimeout(() => {
      if (!hoveredRef.current || run !== runRef.current) return;
      const times = timesRef.current;
      if (index >= times.length) {
        finishPreview(run);
        return;
      }
      const nextLayer = index % 2;
      const nextVideo = nextLayer === 0 ? videoARef.current : videoBRef.current;
      const previousVideo = nextLayer === 0 ? videoBRef.current : videoARef.current;
      if (!nextVideo) return;
      try { nextVideo.currentTime = times[index]; } catch {}
      nextVideo.muted = true;
      nextVideo.volume = 0;
      void nextVideo.play().catch(() => undefined);
      setActiveLayer(nextLayer);
      window.setTimeout(() => previousVideo?.pause(), CROSSFADE_MS + 40);
      if (index === times.length - 1) {
        sequenceTimerRef.current = window.setTimeout(() => finishPreview(run), SAMPLE_MS);
      } else {
        scheduleNext(index + 1, run);
      }
    }, SAMPLE_MS);
  }, [finishPreview]);

  const startPreview = useCallback((run: number) => {
    if (!source || !hoveredRef.current || run !== runRef.current) return;
    const a = videoARef.current;
    const b = videoBRef.current;
    if (!a || !b) return;

    const begin = () => {
      if (!hoveredRef.current || run !== runRef.current) return;
      const duration = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : 0;
      if (!duration) return;
      timesRef.current = sampleTimes(duration);
      a.muted = true; a.volume = 0; a.controls = false; a.playsInline = true;
      b.muted = true; b.volume = 0; b.controls = false; b.playsInline = true;
      try { a.currentTime = timesRef.current[0] ?? 0; } catch {}
      try { b.currentTime = timesRef.current[1] ?? timesRef.current[0] ?? 0; } catch {}
      setActiveLayer(0);
      setPhase("active");
      void a.play().catch(() => undefined);
      scheduleNext(1, run);
    };

    if (a.readyState >= 1 && Number.isFinite(a.duration) && a.duration > 0) {
      begin();
      return;
    }

    const onMetadata = () => {
      a.removeEventListener("loadedmetadata", onMetadata);
      begin();
    };
    a.addEventListener("loadedmetadata", onMetadata, { once: true });
    a.load();
    b.load();
  }, [scheduleNext, source]);

  const stopPreview = useCallback(() => {
    hoveredRef.current = false;
    runRef.current += 1;
    clearTimers();
    resetVideos();
    setActiveLayer(0);
    setPhase("idle");
  }, [clearTimers, resetVideos]);

  const handleEnter = useCallback(() => {
    if (!source) return;
    hoveredRef.current = true;
    runRef.current += 1;
    const run = runRef.current;
    clearTimers();
    resetVideos();
    setPhase("waiting");
    hoverTimerRef.current = window.setTimeout(() => startPreview(run), HOVER_DELAY);
  }, [clearTimers, resetVideos, source, startPreview]);

  useEffect(() => () => stopPreview(), [stopPreview]);

  if (!source) return null;

  return (
    <div
      className={`ravine-hover-preview${phase === "active" ? " is-active" : ""}${phase === "fading" ? " is-fading" : ""}`}
      onPointerEnter={handleEnter}
      onPointerLeave={stopPreview}
      aria-hidden="true"
    >
      <video ref={videoARef} className={`ravine-hover-preview-layer${activeLayer === 0 && phase === "active" ? " is-active" : ""}`} src={source} muted playsInline preload="metadata" tabIndex={-1} />
      <video ref={videoBRef} className={`ravine-hover-preview-layer${activeLayer === 1 && phase === "active" ? " is-active" : ""}`} src={source} muted playsInline preload="metadata" tabIndex={-1} />
      <span className="ravine-hover-preview-wash" />
    </div>
  );
}

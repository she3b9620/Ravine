"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type Props = { videoUrl: string | null; videoId: number };
type Phase = "idle" | "waiting" | "active" | "fading";

const HOVER_DELAY = 1000;
const FADE_OUT_MS = 420;
const LOOP_GAP_MS = 140;
const SAMPLE_MS = 1000;
const SAMPLE_RATIOS = [0.08, 0.26, 0.46, 0.66, 0.84];

function sampleTimes(duration: number) {
  const maxStart = Math.max(0, duration - 0.8);
  return SAMPLE_RATIOS.map((ratio) => Math.min(maxStart, Math.max(0, duration * ratio)));
}

export default function VideoHoverPreview({ videoUrl, videoId }: Props) {
  const [mounted, setMounted] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeLayer, setActiveLayer] = useState(0);
  const firstVideoRef = useRef<HTMLVideoElement>(null);
  const secondVideoRef = useRef<HTMLVideoElement>(null);
  const hoverTimerRef = useRef<number | null>(null);
  const sequenceTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const runRef = useRef(0);
  const hoveredRef = useRef(false);

  const clearTimers = useCallback(() => {
    for (const timer of [hoverTimerRef, sequenceTimerRef, fadeTimerRef]) {
      if (timer.current !== null) window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const resetVideos = useCallback(() => {
    for (const video of [firstVideoRef.current, secondVideoRef.current]) {
      if (!video) continue;
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        // The media element may not have loaded metadata yet.
      }
    }
  }, []);

  const stopPreview = useCallback(() => {
    hoveredRef.current = false;
    runRef.current += 1;
    clearTimers();
    resetVideos();
    setActiveLayer(0);
    setPhase("idle");
  }, [clearTimers, resetVideos]);

  const startPreview = useCallback(() => {
    const first = firstVideoRef.current;
    const second = secondVideoRef.current;
    const run = runRef.current;
    if (!first || !second || !hoveredRef.current || run === 0) return;

    const begin = () => {
      if (!hoveredRef.current || run !== runRef.current || !Number.isFinite(first.duration) || first.duration <= 0) return;
      const times = sampleTimes(first.duration);
      first.muted = true;
      second.muted = true;
      first.currentTime = times[0] ?? 0;
      second.currentTime = times[1] ?? times[0] ?? 0;
      setActiveLayer(0);
      setPhase("active");
      void first.play().catch(() => undefined);

      let index = 1;
      const advance = () => {
        if (!hoveredRef.current || run !== runRef.current) return;
        if (index >= times.length) {
          setPhase("fading");
          fadeTimerRef.current = window.setTimeout(() => {
            resetVideos();
            setPhase("idle");
            if (hoveredRef.current && run === runRef.current) {
              sequenceTimerRef.current = window.setTimeout(() => {
                setPhase("waiting");
                startPreview();
              }, LOOP_GAP_MS);
            }
          }, FADE_OUT_MS);
          return;
        }
        const layer = index % 2;
        const next = layer === 0 ? first : second;
        next.currentTime = times[index];
        void next.play().catch(() => undefined);
        setActiveLayer(layer);
        index += 1;
        sequenceTimerRef.current = window.setTimeout(advance, SAMPLE_MS);
      };
      sequenceTimerRef.current = window.setTimeout(advance, SAMPLE_MS);
    };

    if (first.readyState >= 1 && Number.isFinite(first.duration) && first.duration > 0) begin();
    else first.addEventListener("loadedmetadata", begin, { once: true });
    first.load();
    second.load();
  }, [resetVideos]);

  const handleEnter = useCallback(() => {
    if (!videoUrl) return;
    hoveredRef.current = true;
    runRef.current += 1;
    clearTimers();
    resetVideos();
    setPhase("waiting");
    hoverTimerRef.current = window.setTimeout(startPreview, HOVER_DELAY);
  }, [clearTimers, resetVideos, startPreview, videoUrl]);

  useEffect(() => {
    setMounted(true);
    return () => stopPreview();
  }, [stopPreview]);

  if (!videoUrl || !mounted) return null;

  return (
    <div
      className={`ravine-hover-preview${phase === "active" ? " is-active" : ""}${phase === "fading" ? " is-fading" : ""}`}
      onPointerEnter={handleEnter}
      onPointerLeave={stopPreview}
      aria-hidden="true"
      data-video-id={videoId}
    >
      <video ref={firstVideoRef} className={`ravine-hover-preview-layer${activeLayer === 0 && phase === "active" ? " is-active" : ""}`} src={videoUrl} muted playsInline preload="metadata" tabIndex={-1} />
      <video ref={secondVideoRef} className={`ravine-hover-preview-layer${activeLayer === 1 && phase === "active" ? " is-active" : ""}`} src={videoUrl} muted playsInline preload="metadata" tabIndex={-1} />
      <span className="ravine-hover-preview-wash" />
    </div>
  );
}
